import express from 'express';
import { db } from '../db/index';
import { analyses } from '../db/schema';
import { ANALYSES_PUBLIC_OFFSET } from '../config/stats';
import { and, gte, lt, sql } from 'drizzle-orm';

const router = express.Router();

// GET /api/stats - zwraca liczę wykonanych analiz i inne statystyki
router.get('/', async (req, res) => {
    try {
        const totalRow = await db
            .select({ count: sql<number>`count(*)` })
            .from(analyses)
            .get();
        const totalAnalyses = (Number(totalRow?.count ?? 0) || 0) + ANALYSES_PUBLIC_OFFSET;

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const todayRow = await db
            .select({ count: sql<number>`count(*)` })
            .from(analyses)
            .where(and(gte(analyses.created_at, start), lt(analyses.created_at, end)))
            .get();
        const analysesToday = Number(todayRow?.count ?? 0) || 0;

        res.json({
            total: totalAnalyses,
            today: analysesToday,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics', total: 0, today: 0 });
    }
});

export default router;
