import express from 'express';
import { db } from '../db/index';
import { licenses } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createLicense } from '../services/license';
import { sendLicenseEmail } from '../services/email';
import {
    createTpayTransaction,
    extractTpayTransactionId,
    getPlanPrice,
    isSuccessfulTpayStatus,
} from '../services/tpay';
import { createIfirmaInvoice } from '../services/ifirma';

const router = express.Router();

const ALLOWED_PLANS = ['lite', 'pro', 'premium'] as const;
type PaidPlan = typeof ALLOWED_PLANS[number];

function isPaidPlan(plan: string): plan is PaidPlan {
    return ALLOWED_PLANS.includes(plan as PaidPlan);
}

function getPublicAppUrl() {
    return process.env.PUBLIC_APP_URL || 'http://localhost:3000';
}

function getApiPublicUrl() {
    return process.env.PUBLIC_API_URL || 'http://localhost:3001';
}

// Create real payment in Tpay and return redirect URL
router.post('/checkout', express.json(), async (req, res) => {
    try {
        const { plan, email } = req.body as { plan?: string; email?: string };

        if (!plan || !email) {
            return res.status(400).json({ error: 'Plan and email are required' });
        }

        if (!isPaidPlan(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const license = await createLicense(plan, email);

        const transaction = await createTpayTransaction({
            plan,
            email,
            amount: getPlanPrice(plan),
            description: `TruLab Meter ${plan.toUpperCase()} plan`,
            hiddenDescription: license.id,
            successUrl: `${getPublicAppUrl()}/payment?status=success&tx={transactionId}`,
            errorUrl: `${getPublicAppUrl()}/payment?status=error`,
            notificationUrl: `${getApiPublicUrl()}/api/payment/tpay/webhook`,
        });

        await db
            .update(licenses)
            .set({ stripe_session_id: transaction.transactionId })
            .where(eq(licenses.id, license.id));

        res.json({
            success: true,
            transactionId: transaction.transactionId,
            redirectUrl: transaction.paymentUrl,
        });
    } catch (error) {
        console.error('Tpay checkout error:', error);
        res.status(500).json({ error: 'Failed to create Tpay checkout transaction' });
    }
});

// Tpay webhook -> activate plan -> create iFirma invoice -> send user access
router.post('/tpay/webhook', express.json(), async (req, res) => {
    try {
        const payload = req.body || {};
        const transactionId = extractTpayTransactionId(payload);
        const status = String(payload?.status || payload?.tr_status || '').toLowerCase();

        if (!transactionId) {
            return res.status(400).json({ error: 'Missing transaction id in webhook payload' });
        }

        const licenseRows = await db
            .select()
            .from(licenses)
            .where(eq(licenses.stripe_session_id, transactionId));
        const license = licenseRows[0];

        if (!license) {
            return res.status(200).json({ ok: true, ignored: true, reason: 'license-not-found' });
        }

        if (!isSuccessfulTpayStatus(status)) {
            return res.status(200).json({ ok: true, ignored: true, reason: `status-${status || 'unknown'}` });
        }

        if (license.status !== 'active') {
            await db
                .update(licenses)
                .set({
                    status: 'active',
                    activated_at: new Date(),
                })
                .where(eq(licenses.id, license.id));

            if (license.email) {
                await sendLicenseEmail(license.email, license.code, license.plan);
            }

            await createIfirmaInvoice({
                email: license.email || 'unknown@example.com',
                plan: license.plan,
                amount: getPlanPrice(license.plan as PaidPlan),
                paymentTransactionId: transactionId,
                licenseCode: license.code,
            });
        }

        return res.json({ ok: true });
    } catch (error) {
        console.error('Tpay webhook error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Frontend polling endpoint after redirect from bank/BLIK
router.get('/status/:transactionId', async (req, res) => {
    try {
        const transactionId = req.params.transactionId;
        if (!transactionId) {
            return res.status(400).json({ error: 'transactionId is required' });
        }

        const rows = await db.select().from(licenses).where(eq(licenses.stripe_session_id, transactionId));
        const license = rows[0];

        if (!license) {
            return res.status(404).json({ found: false });
        }

        return res.json({
            found: true,
            status: license.status,
            plan: license.plan,
            code: license.status === 'active' ? license.code : null,
            email: license.email || null,
        });
    } catch (error) {
        console.error('Payment status error:', error);
        return res.status(500).json({ error: 'Failed to read payment status' });
    }
});

// Simulated payment endpoint
router.post('/simulate', express.json(), async (req, res) => {
    try {
        const { plan, email } = req.body;

        if (!plan || !email) {
            return res.status(400).json({ error: 'Plan and email are required' });
        }

        if (!['lite', 'pro', 'premium'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        // 1. "Process" payment (simulated delay)
        console.log(`💰 Simulating payment for ${plan} plan by ${email}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Create license
        const license = await createLicense(plan, email);
        console.log(`🔑 License created: ${license.code}`);

        // 3. Send email
        await sendLicenseEmail(email, license.code, plan);

        res.json({
            success: true,
            message: 'Payment simulated successfully. License code sent to email.',
            code: license.code, // Returning code directly for UX convenience in dev
        });

    } catch (error) {
        console.error('Simulated Payment Error:', error);
        res.status(500).json({ error: 'Failed to simulate payment' });
    }
});

export default router;
