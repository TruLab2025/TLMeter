import express from 'express';
import { requireAccessToken, type AuthedRequest } from '../middleware/requireAccessToken';

const router = express.Router();

// Example protected endpoint (stateless token required)
router.post('/', requireAccessToken, (req: AuthedRequest, res) => {
  return res.json({
    ok: true,
    plan: req.access?.plan ?? 'free',
    exp: req.access?.exp ?? null,
  });
});

export default router;

