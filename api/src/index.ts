import cors from 'cors';
import express from 'express';
import { db } from './db/index';
import { licenses } from './db/schema';
import { eq } from 'drizzle-orm';

const app = express();
app.use(express.json());

app.use(cors());

// Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import licenseRoutes from './routes/license';
import paymentRoutes from './routes/payment';
import statsRoutes from './routes/stats';
import analysesRoutes from './routes/analyses';
import devRoutes from './routes/dev';

// Import and use routes
app.use('/api/license', licenseRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/analyses', analysesRoutes);
app.use('/api/dev', devRoutes);
// app.use('/api/reports', reportsRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 API is running on http://localhost:${PORT}`);
});
