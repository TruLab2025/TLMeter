import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { parseAllowedOrigins } from './middleware/security';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({
    limit: '256kb',
    verify(req, _res, buf) {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
    },
}));

const allowedOrigins = parseAllowedOrigins();
app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS: origin not allowed'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-device-id', 'x-proof', 'x-proof-ts'],
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import licenseRoutesLegacy from './routes/license';
import licenseRoutesStateless from './routes/licenseStateless';
import paymentRoutes from './routes/payment';
import statsRoutes from './routes/stats';
import analysesRoutes from './routes/analyses';
import analyzeRoutes from './routes/analyze';
import webhookStripeRoutes from './routes/webhookStripe';
import devRoutes from './routes/dev';
import { isProduction } from './middleware/security';

// Import and use routes
const licenseMode = (process.env.LICENSE_MODE || 'stateless').toLowerCase();
app.use('/api/license', licenseMode === 'db' ? licenseRoutesLegacy : licenseRoutesStateless);
app.use('/api/payment', paymentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/analyses', analysesRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/webhook', webhookStripeRoutes);
if (!isProduction()) {
    app.use('/api/dev', devRoutes);
}
// app.use('/api/reports', reportsRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 API is running on http://localhost:${PORT}`);
});
