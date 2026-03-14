import express from 'express';
import { db } from '../db/index';
import { analyses } from '../db/schema';
import { ANALYSES_PUBLIC_OFFSET } from '../config/stats';

const router = express.Router();

// GET /api/stats - zwraca liczę wykonanych analiz i inne statystyki
router.get('/', async (req, res) => {
    try {
        const allAnalyses = await db.select().from(analyses);
        const totalAnalyses = (allAnalyses?.length || 0) + ANALYSES_PUBLIC_OFFSET;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const analysesToday = (allAnalyses || []).filter(a => {
            if (!a.created_at) return false;
            const createdDate = new Date(a.created_at);
            createdDate.setHours(0, 0, 0, 0);
            return createdDate.getTime() === today.getTime();
        }).length;

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
