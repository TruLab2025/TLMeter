import express from 'express';
import { db } from '../db/index';
import { licenses } from '../db/schema';
import { requireAdminApiKey, requireDevelopmentOnly } from '../middleware/security';

const router = express.Router();

router.use(requireDevelopmentOnly);
router.use(requireAdminApiKey);

// GET /api/dev/test-licenses - zwróć wszystkie test license kody
router.get('/test-licenses', async (req, res) => {
    try {
        const allLicenses = await db.select().from(licenses);
        
        const byPlan = {
            free: [],
            lite: (allLicenses || []).filter((l: any) => l.plan === 'lite'),
            pro: (allLicenses || []).filter((l: any) => l.plan === 'pro'),
            premium: (allLicenses || []).filter((l: any) => l.plan === 'premium'),
        };

        res.json(byPlan);
    } catch (error) {
        console.error('Error fetching licenses:', error);
        res.status(500).json({ error: 'Failed to fetch licenses' });
    }
});

// POST /api/dev/generate-test-licenses - wygeneruj test kody
router.post('/generate-test-licenses', async (req, res) => {
    try {
        const plans = ['lite', 'pro', 'premium'];
        const generated = [];

        for (const plan of plans) {
            for (let i = 0; i < 3; i++) {
                const code = `TEST-${plan.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
                
                const license = {
                    id: Math.random().toString(36).substring(2, 15),
                    code,
                    plan,
                    status: 'unused',
                    email: null,
                    fingerprint: null,
                    device_limit: plan === 'lite' ? 1 : plan === 'pro' ? 2 : 3,
                    activated_at: null,
                    expires_at: null,
                    stripe_session_id: null,
                    created_at: new Date(),
                };

                await db.insert(licenses).values(license as any);
                generated.push({ code, plan });
            }
        }

        res.json({ success: true, generated });
    } catch (error) {
        console.error('Error generating licenses:', error);
        res.status(500).json({ error: 'Failed to generate licenses', details: (error as any).message });
    }
});

export default router;
