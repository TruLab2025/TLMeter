import express, { Request, Response } from 'express';
import { db } from '../db/index';
import { licenses } from '../db/schema';
import { requireAdminApiKey, requireDevelopmentOnly } from '../middleware/security';
import type { InferModel } from 'drizzle-orm';

type LicenseRow = InferModel<typeof licenses>;
type LicenseInsert = InferModel<typeof licenses, 'insert'>;
type PlanValue = 'lite' | 'pro' | 'premium';

const router = express.Router();

router.use(requireDevelopmentOnly);
router.use(requireAdminApiKey);

// GET /api/dev/test-licenses - zwróć wszystkie test license kody
router.get('/test-licenses', async (_req: Request, res: Response) => {
    try {
        const allLicenses: LicenseRow[] = await db.select().from(licenses);
        const byPlan: Record<PlanValue | 'free', LicenseRow[]> = {
            free: [],
            lite: allLicenses.filter((l) => l.plan === 'lite'),
            pro: allLicenses.filter((l) => l.plan === 'pro'),
            premium: allLicenses.filter((l) => l.plan === 'premium'),
        };

        res.json(byPlan);
    } catch (error) {
        console.error('Error fetching licenses:', error);
        res.status(500).json({ error: 'Failed to fetch licenses' });
    }
});

// POST /api/dev/generate-test-licenses - wygeneruj test kody
router.post('/generate-test-licenses', async (_req: Request, res: Response) => {
    try {
        const plans: PlanValue[] = ['lite', 'pro', 'premium'];
        const generated: { code: string; plan: PlanValue }[] = [];

        for (const plan of plans) {
            for (let i = 0; i < 3; i++) {
                const code = `TEST-${plan.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

                const license: LicenseInsert = {
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

                await db.insert(licenses).values(license);
                generated.push({ code, plan });
            }
        }

        res.json({ success: true, generated });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error generating licenses:', message);
        res.status(500).json({ error: 'Failed to generate licenses', details: message });
    }
});

export default router;
