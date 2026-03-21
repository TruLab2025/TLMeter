import express from 'express';
import { sendAccessTokenEmail } from '../services/email';
import {
    createTpayTransaction,
    extractTpayTransactionId,
    getTpayTransaction,
    getPlanPrice,
    isSuccessfulTpayStatus,
} from '../services/tpay';
import { createIfirmaInvoice } from '../services/ifirma';
import { requireDevelopmentOnly } from '../middleware/security';
import { createAccessToken, getAccessTokenSecret, type AccessPlan } from '../lib/token';
import { createPaymentContext, verifyPaymentContext } from '../lib/paymentContext';
import { deriveSubIdFromEmail, upsertEntitlement } from '../services/entitlements';

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
    return process.env.PUBLIC_API_URL || 'http://localhost:3000';
}

// Create real payment in Tpay and return redirect URL
router.post('/checkout', express.json(), async (req, res) => {
    try {
        const { plan, email, device_id, device_pub } = req.body as { plan?: string; email?: string; device_id?: string; device_pub?: string };

        if (!plan || !email) {
            return res.status(400).json({ error: 'Plan and email are required' });
        }

        if (!isPaidPlan(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const deviceId = typeof device_id === 'string' ? device_id.trim() : '';
        if (!deviceId || deviceId.length > 128) {
            return res.status(400).json({ error: 'device_id is required' });
        }

        const devicePub = typeof device_pub === 'string' ? device_pub.trim() : '';
        if (!devicePub || devicePub.length > 2048) {
            return res.status(400).json({ error: 'device_pub is required' });
        }

        const iat = Math.floor(Date.now() / 1000);
        const ctx = createPaymentContext({ device_id: deviceId, device_pub: devicePub, plan, email, iat });

        const transaction = await createTpayTransaction({
            plan,
            email,
            amount: getPlanPrice(plan),
            description: `TruLab Meter ${plan.toUpperCase()} plan`,
            hiddenDescription: ctx,
            successUrl: `${getPublicAppUrl()}/payment?status=success&tx={transactionId}`,
            errorUrl: `${getPublicAppUrl()}/payment?status=error`,
            notificationUrl: `${getApiPublicUrl()}/api/payment/tpay/webhook`,
        });

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
        const hidden = String(payload?.hiddenDescription || payload?.hidden_description || payload?.hidden_desc || '');

        if (!transactionId) {
            return res.status(400).json({ error: 'Missing transaction id in webhook payload' });
        }

        if (!isSuccessfulTpayStatus(status)) {
            return res.status(200).json({ ok: true, ignored: true, reason: `status-${status || 'unknown'}` });
        }

        let ctxRaw = hidden;
        if (!ctxRaw) {
            try {
                const details = await getTpayTransaction(transactionId);
                ctxRaw = String(details?.hiddenDescription || details?.hidden_description || details?.hidden_desc || details?.data?.hiddenDescription || '');
            } catch (error) {
                console.warn('[tpay] could not fetch transaction details for context', error);
            }
        }

        const verified = verifyPaymentContext(ctxRaw);
        if (!verified.ok) {
            return res.status(200).json({ ok: true, ignored: true, reason: verified.error });
        }

        const ctx = verified.ctx;
        const exp = ctx.iat + 30 * 24 * 60 * 60;
        const sub = deriveSubIdFromEmail(ctx.email);
        try {
            await upsertEntitlement({ sub, plan: ctx.plan, expiresAt: exp, devicePub: ctx.device_pub });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return res.status(200).json({ ok: true, ignored: true, reason: msg });
        }
        const token = createAccessToken({ sub, device_id: ctx.device_id, device_pub: ctx.device_pub, plan: ctx.plan, exp }, getAccessTokenSecret());

        await sendAccessTokenEmail(ctx.email, token, ctx.plan);

        const ref = `${token.slice(0, 12)}…${token.slice(-8)}`;
        await createIfirmaInvoice({
            email: ctx.email,
            plan: ctx.plan,
            amount: getPlanPrice(ctx.plan as PaidPlan),
            paymentTransactionId: transactionId,
            licenseCode: ref,
        });

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
        const deviceIdHeader = String(req.header('x-device-id') || '').trim();
        if (!deviceIdHeader) {
            return res.status(400).json({ error: 'missing-device-id' });
        }

        const details = await getTpayTransaction(transactionId);
        const status = String(details?.status || details?.tr_status || details?.transactionStatus || '').toLowerCase();
        const hidden = String(details?.hiddenDescription || details?.hidden_description || details?.hidden_desc || details?.data?.hiddenDescription || '');
        const verified = verifyPaymentContext(hidden);

        if (!verified.ok) {
            return res.status(200).json({ found: true, status: 'unknown', error: verified.error });
        }

        const ctx = verified.ctx;
        if (ctx.device_id !== deviceIdHeader) {
            return res.status(200).json({ found: true, status: 'device-mismatch' });
        }

        if (!isSuccessfulTpayStatus(status)) {
            return res.json({ found: true, status: status || 'pending', plan: ctx.plan });
        }

        const exp = ctx.iat + 30 * 24 * 60 * 60;
        const sub = deriveSubIdFromEmail(ctx.email);
        try {
            await upsertEntitlement({ sub, plan: ctx.plan, expiresAt: exp, devicePub: ctx.device_pub });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return res.status(200).json({ found: true, status: 'active', plan: ctx.plan, error: msg });
        }
        const token = createAccessToken({ sub, device_id: ctx.device_id, device_pub: ctx.device_pub, plan: ctx.plan, exp }, getAccessTokenSecret());

        return res.json({
            found: true,
            status: 'active',
            plan: ctx.plan,
            email: ctx.email,
            token,
        });
    } catch (error) {
        console.error('Payment status error:', error);
        return res.status(500).json({ error: 'Failed to read payment status' });
    }
});

// Simulated payment endpoint
router.post('/simulate', requireDevelopmentOnly, express.json(), async (req, res) => {
    try {
        const { plan, email, device_id, device_pub } = req.body as { plan?: string; email?: string; device_id?: string; device_pub?: string };

        if (!plan || !email) {
            return res.status(400).json({ error: 'Plan and email are required' });
        }

        if (!['lite', 'pro', 'premium'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        // 1. "Process" payment (simulated delay)
        console.log(`💰 Simulating payment for ${plan} plan by ${email}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const deviceId = typeof device_id === 'string' ? device_id.trim() : '';
        if (!deviceId) {
            return res.status(400).json({ error: 'device_id is required' });
        }
        const devicePub = typeof device_pub === 'string' ? device_pub.trim() : '';
        if (!devicePub) {
            return res.status(400).json({ error: 'device_pub is required' });
        }

        // 2. Issue stateless token
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 30 * 24 * 60 * 60;
        let token: string | null = null;
        const sub = deriveSubIdFromEmail(email);
        await upsertEntitlement({ sub, plan: plan as AccessPlan, expiresAt: exp, devicePub });
        token = createAccessToken({ sub, device_id: deviceId, device_pub: devicePub, plan: plan as AccessPlan, exp }, getAccessTokenSecret());
        await sendAccessTokenEmail(email, token, plan);

        res.json({
            success: true,
            message: 'Payment simulated successfully. Access key sent to email.',
            token,
        });

    } catch (error) {
        console.error('Simulated Payment Error:', error);
        res.status(500).json({ error: 'Failed to simulate payment' });
    }
});

export default router;
