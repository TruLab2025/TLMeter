import express, { Request, Response } from 'express';
import { db } from '../db/index';
import { licenses, licenseDevices } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createAccessToken, getAccessTokenSecret, verifyAccessToken, type AccessPlan } from '../lib/token';
import { requireDevelopmentOnly } from '../middleware/security';
import { deriveDevSubId, upsertEntitlement } from '../services/entitlements';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(32).toString('hex'));

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
}

const activationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.LICENSE_ACTIVATION_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
});

const validationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.LICENSE_VALIDATION_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
});

type LicenseActivationBody = {
    code?: string;
    fingerprint?: string;
    userAgent?: string;
};

type LicenseValidateBody = {
    token?: string;
    fingerprint?: string;
};

type DecodedSession = {
    licenseId: string;
    fingerprint: string;
};

type LicenseGenerationBody = {
    plan?: string;
    device_id?: string;
    device_pub?: string;
};

// 1. Activate License
router.post('/activate', activationLimiter, express.json(), async (req: Request<Record<string, never>, unknown, LicenseActivationBody>, res: Response) => {
    try {
        const { code, fingerprint, userAgent } = req.body;

        if (!code || !fingerprint) {
            return res.status(400).json({ error: 'Code and fingerprint are required' });
        }

        if (typeof code !== 'string' || typeof fingerprint !== 'string') {
            return res.status(400).json({ error: 'Invalid input types' });
        }

        if (code.length > 64 || fingerprint.length > 128) {
            return res.status(400).json({ error: 'Input too long' });
        }

        // Find license
        const licenseRecords = await db.select().from(licenses).where(eq(licenses.code, code));
        const license = licenseRecords[0];

        if (!license) {
            return res.status(404).json({ error: 'License not found or invalid' });
        }

        const now = new Date();

        // Check status
        if (license.status === 'revoked') {
            return res.status(403).json({ error: 'This license has been revoked' });
        }

        // Get current devices
        const devices = await db.select().from(licenseDevices).where(eq(licenseDevices.license_id, license.id));

        // Check if this fingerprint is already registered
        const deviceRecord = devices.find((d) => d.fingerprint === fingerprint);

        if (!deviceRecord) {
            // New device. Check limit
            if (devices.length >= (license.device_limit || 1)) {
                return res.status(403).json({
                    error: `Device limit reached. This plan allows max ${license.device_limit} active session(s).`
                });
            }

            // Register new device
            await db.insert(licenseDevices).values({
                id: crypto.randomUUID(),
                license_id: license.id,
                fingerprint: fingerprint,
                user_agent: userAgent || 'Unknown OS/Browser',
                last_seen_at: now,
            });
        } else {
            // Update last seen
            await db.update(licenseDevices)
                .set({ last_seen_at: now })
                .where(eq(licenseDevices.id, deviceRecord.id));
        }

        // Mark as active if it was unused
        if (license.status === 'unused') {
            await db.update(licenses)
                .set({
                    status: 'active',
                    activated_at: now,
                })
                .where(eq(licenses.id, license.id));
        }

        // Generate JWT Session Token (Valid for 30 days)
        const token = jwt.sign(
            {
                licenseId: license.id,
                plan: license.plan,
                fingerprint: fingerprint,
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            plan: license.plan,
            message: 'License activated successfully',
        });

    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({ error: 'Internal server error during activation' });
    }
});

// 2. Validate Session (called by frontend on load/actions)
router.post('/validate', validationLimiter, express.json(), async (req: Request<Record<string, never>, unknown, LicenseValidateBody>, res: Response) => {
    try {
        const { token, fingerprint } = req.body;

        if (!token) {
            return res.json({ valid: false, plan: 'free' });
        }

        if (typeof token !== 'string' || token.length > 4096) {
            return res.json({ valid: false, plan: 'free' });
        }

        // Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedSession;

        // If frontend fingerprint doesn't match the one in token, reject (prevents token stealing)
        if (decoded.fingerprint !== fingerprint) {
            return res.json({ valid: false, plan: 'free', error: 'Fingerprint mismatch' });
        }

        // Check DB for revocation / expiration
        const licenseRecords = await db.select().from(licenses).where(eq(licenses.id, decoded.licenseId));
        const license = licenseRecords[0];

        if (!license || license.status !== 'active') {
            return res.json({ valid: false, plan: 'free' });
        }

        res.json({ valid: true, plan: license.plan });
    } catch {
        // Token expired or invalid
        res.json({ valid: false, plan: 'free' });
    }
});

function extractBearerToken(headerValue: string | undefined): string | null {
    if (!headerValue) return null;
    const match = headerValue.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    return match[1]?.trim() || null;
}

// Stateless token validation (no DB lookup)
router.post('/validate-token', express.json(), (req, res) => {
    const deviceId = req.header('x-device-id') || '';
    if (!deviceId) {
        return res.status(400).json({ valid: false, error: 'missing-device-id' });
    }

    const token = extractBearerToken(req.header('authorization')) || (typeof req.body?.token === 'string' ? req.body.token : '');
    const secret = getAccessTokenSecret();
    const result = verifyAccessToken(token, secret, deviceId);
    if (!result.ok) {
        return res.json({ valid: false, error: result.error });
    }
    return res.json({ valid: true, payload: result.payload });
});

// Dry-run token issuer (DEV only) - simulates "payment success -> issue token"
router.post('/dev-issue', requireDevelopmentOnly, express.json(), (req: Request<Record<string, never>, unknown, LicenseGenerationBody>, res: Response) => {
    const deviceId = req.header('x-device-id') || (typeof req.body?.device_id === 'string' ? req.body.device_id : '');
    if (!deviceId) {
        return res.status(400).json({ error: 'missing-device-id' });
    }

    const requestedPlan = typeof req.body?.plan === 'string' ? req.body.plan : 'pro';
    const plan: AccessPlan = (requestedPlan === 'lite' || requestedPlan === 'premium' || requestedPlan === 'pro')
        ? requestedPlan
        : 'pro';

    const devicePub = typeof req.body?.device_pub === 'string' ? String(req.body.device_pub).trim() : '';
    if (!devicePub || devicePub.length > 2048) {
        return res.status(400).json({ error: 'missing-device-pub' });
    }

    const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const sub = deriveDevSubId(devicePub);
    const payload = { sub, device_id: deviceId, device_pub: devicePub, plan, exp };
    void upsertEntitlement({ sub, plan, expiresAt: exp, devicePub })
        .then(() => {
            const token = createAccessToken(payload, getAccessTokenSecret());
            return res.json({ token, payload });
        })
        .catch((error: unknown) => {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg === 'device-limit') return res.status(403).json({ error: 'device-limit' });
            if (msg === 'revoked') return res.status(403).json({ error: 'revoked' });
            return res.status(500).json({ error: 'issue-failed' });
        });
});

export default router;
