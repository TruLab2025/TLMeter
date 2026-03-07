import express from 'express';
import { db } from '../db/index';
import { licenses, licenseDevices } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'trulab_super_secret_dev_key';

// 1. Activate License
router.post('/activate', express.json(), async (req, res) => {
    try {
        const { code, fingerprint, userAgent } = req.body;

        if (!code || !fingerprint) {
            return res.status(400).json({ error: 'Code and fingerprint are required' });
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
        let deviceRecord = devices.find(d => d.fingerprint === fingerprint);

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
                fingerprint: fingerprint
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
router.post('/validate', express.json(), async (req, res) => {
    try {
        const { token, fingerprint } = req.body;

        if (!token) {
            return res.json({ valid: false, plan: 'free' });
        }

        // Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET) as any;

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
    } catch (error) {
        // Token expired or invalid
        res.json({ valid: false, plan: 'free' });
    }
});

export default router;
