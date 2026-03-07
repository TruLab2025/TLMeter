import express from 'express';
import { db } from '../db/index';
import { analyses } from '../db/schema';
import { randomUUID } from 'crypto';

const router = express.Router();

// POST /api/analyses - zapisz nową analizę
router.post('/', async (req, res) => {
    try {
        const { license_id, style, filename, created_at } = req.body;

        if (!style) {
            return res.status(400).json({ error: 'Style is required' });
        }

        const analysis = {
            id: randomUUID(),
            license_id: license_id || null, // null = free user
            style,
            filename: filename || 'Unknown',
            summary: {},
            full_data: {},
            score: null,
            created_at: created_at ? new Date(created_at) : new Date(),
        };

        await db.insert(analyses).values(analysis as any);

        res.json({ success: true, id: analysis.id });
    } catch (error) {
        console.error('Error saving analysis:', error);
        res.status(500).json({ error: 'Failed to save analysis' });
    }
});

// GET /api/analyses - pobierz wszystkie analizy (optional, dla debugowania)
router.get('/', async (req, res) => {
    try {
        const allAnalyses = await db.select().from(analyses);
        res.json(allAnalyses);
    } catch (error) {
        console.error('Error fetching analyses:', error);
        res.status(500).json({ error: 'Failed to fetch analyses' });
    }
});

// POST /api/analyses/submit-metrics - Wysłanie anonimowych metryk do agregacji
// Endpoint zbiera anonimowe metryki DSP z przeglądarki użytkownika
// i agreguje je do aktualizacji profili stylów.
// PRIVACY: NIGDY nie przesyłamy filename, user_id, audio czy metadanych
router.post('/submit-metrics', async (req, res) => {
    try {
        const { style, metrics } = req.body;

        // SECURITY CHECK: Odrzuć jeśli ktoś próbuje wysłać identyfikowalne dane
        const forbiddenKeys = ['filename', 'file_name', 'user_id', 'artist', 'title', 'audio', 'userId', 'userName', 'email'];
        if (req.body.filename || req.body.file_name || req.body.user_id || req.body.artist || req.body.title || req.body.audio || req.body.userId || req.body.userName || req.body.email) {
            console.warn('🚨 SECURITY: Attempted to submit PII data in metrics');
            return res.status(400).json({ 
                error: 'Forbidden: Do not submit filename, artist, user data or audio with metrics' 
            });
        }

        // Validacja podstawowa
        if (!style) {
            return res.status(400).json({ error: 'Missing style parameter' });
        }

        if (!metrics || typeof metrics !== 'object') {
            return res.status(400).json({ error: 'Missing or invalid metrics' });
        }

        // Validacja metryk (muszą być liczby)
        const requiredMetrics = [
            'lufs',
            'true_peak',
            'low_ratio',
            'mid_ratio',
            'high_ratio',
            'stereo_width',
            'harshness_index',
        ];

        for (const metric of requiredMetrics) {
            if (typeof (metrics as any)[metric] !== 'number') {
                return res.status(400).json({
                    error: `Missing or invalid metric: ${metric}`,
                });
            }
        }

        // W przyszłości: dodaj do bazy, oblicz percentyle, itp.
        // Na razie loguj do debugowania
        console.log(`Received metrics for style: ${style}`, metrics);

        return res.json({
            success: true,
            message: 'Metrics submitted successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error submitting metrics:', error);
        res.status(500).json({ error: 'Failed to submit metrics' });
    }
});

export default router;
