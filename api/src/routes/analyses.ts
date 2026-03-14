import express from 'express';
import { db } from '../db/index';
import { analyses, licenses } from '../db/schema';
import { randomUUID } from 'crypto';
import { requireAdminApiKey } from '../middleware/security';
import { eq, or } from 'drizzle-orm';
import { ANALYSES_PUBLIC_OFFSET } from '../config/stats';

const router = express.Router();

// POST /api/analyses - zapisz nową analizę
router.post('/', async (req, res) => {
    try {
        const { license_id, style, filename, created_at } = req.body;

        if (!style) {
            return res.status(400).json({ error: 'Style is required' });
        }

        if (typeof style !== 'string' || style.length > 64) {
            return res.status(400).json({ error: 'Invalid style value' });
        }

        if (filename && (typeof filename !== 'string' || filename.length > 255)) {
            return res.status(400).json({ error: 'Invalid filename value' });
        }

        let resolvedLicenseId: string | null = null;

        if (typeof license_id === 'string' && license_id.trim().length > 0) {
            const licenseValue = license_id.trim();
            const matchedLicense = await db
                .select({ id: licenses.id })
                .from(licenses)
                .where(or(eq(licenses.id, licenseValue), eq(licenses.code, licenseValue)))
                .get();

            resolvedLicenseId = matchedLicense?.id ?? null;
        }

        const analysis = {
            id: randomUUID(),
            license_id: resolvedLicenseId, // null = free user or unmatched code
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
router.get('/', requireAdminApiKey, async (req, res) => {
    try {
        const allAnalyses = await db.select().from(analyses);
        res.json(allAnalyses);
    } catch (error) {
        console.error('Error fetching analyses:', error);
        res.status(500).json({ error: 'Failed to fetch analyses' });
    }
});

// GET /api/analyses/count - liczba wszystkich analiz (publiczny, do licznika na HP)
router.get('/count', async (req, res) => {
    try {
        // Poprawne zliczanie analiz przez drizzle-orm
        const count = await db.select().from(analyses).execute().then(rows => rows.length + ANALYSES_PUBLIC_OFFSET);
        res.json({ count });
    } catch (error) {
        console.error('Error counting analyses:', error);
        res.status(500).json({ error: 'Failed to count analyses' });
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

        if (typeof style !== 'string' || style.length > 64) {
            return res.status(400).json({ error: 'Invalid style parameter' });
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
        console.log(`Received anonymous metrics for style: ${style}`);

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
