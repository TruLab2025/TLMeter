import express from 'express';
import rateLimit from 'express-rate-limit';
import { createAccessToken, getAccessTokenSecret, verifyAccessToken, type AccessPlan } from '../lib/token';
import { requireDevelopmentOnly } from '../middleware/security';
import { deriveDevSubId, upsertEntitlement } from '../services/entitlements';
import { requireAccessToken, type AuthedRequest } from '../middleware/requireAccessToken';
import { createPairCode, verifyPairCode } from '../lib/pairing';
import { getEntitlement } from '../services/entitlements';

const router = express.Router();

const validationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.LICENSE_VALIDATION_MAX || 240),
  standardHeaders: true,
  legacyHeaders: false,
});

function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1]?.trim() || null;
}

router.post('/validate-token', validationLimiter, express.json(), (req, res) => {
  const deviceId = String(req.header('x-device-id') || '').trim();
  if (!deviceId) {
    return res.status(400).json({ valid: false, error: 'missing-device-id' });
  }

  const token = extractBearerToken(req.header('authorization')) || (typeof req.body?.token === 'string' ? req.body.token : '');
  const secret = getAccessTokenSecret();
  const result = verifyAccessToken(token, secret, deviceId);
  if (!result.ok) {
    return res.json({ valid: false, error: result.error });
  }
  return res.json({ valid: true, payload: result.payload });
});

router.post('/dev-issue', requireDevelopmentOnly, express.json(), (req, res) => {
  const deviceId = String(req.header('x-device-id') || req.body?.device_id || '').trim();
  if (!deviceId) return res.status(400).json({ error: 'missing-device-id' });

  const devicePub = String(req.body?.device_pub || '').trim();
  if (!devicePub || devicePub.length > 2048) return res.status(400).json({ error: 'missing-device-pub' });

  const requestedPlan = String(req.body?.plan || 'pro');
  const plan: AccessPlan =
    requestedPlan === 'lite' || requestedPlan === 'premium' || requestedPlan === 'pro' ? requestedPlan : 'pro';

  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const sub = deriveDevSubId(devicePub);
  const payload = { sub, device_id: deviceId, device_pub: devicePub, plan, exp };
  void upsertEntitlement({ sub, plan, expiresAt: exp, devicePub })
    .then(() => {
      const token = createAccessToken(payload, getAccessTokenSecret());
      return res.json({ token, payload });
    })
    .catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === 'device-limit') return res.status(403).json({ error: 'device-limit' });
      if (msg === 'revoked') return res.status(403).json({ error: 'revoked' });
      return res.status(500).json({ error: 'issue-failed' });
    });
});

router.post('/pair/start', requireAccessToken, (req: AuthedRequest, res) => {
  const access = req.access;
  if (!access) return res.status(401).json({ error: 'unauthorized' });
  const exp = Math.floor(Date.now() / 1000) + 5 * 60;
  const code = createPairCode({ sub: access.sub, plan: access.plan, exp });
  return res.json({ code, exp });
});

router.post('/pair/finish', express.json(), async (req, res) => {
  const code = String(req.body?.code || '').trim();
  const deviceId = String(req.body?.device_id || '').trim();
  const devicePub = String(req.body?.device_pub || '').trim();

  if (!code) return res.status(400).json({ error: 'missing-code' });
  if (!deviceId) return res.status(400).json({ error: 'missing-device-id' });
  if (!devicePub) return res.status(400).json({ error: 'missing-device-pub' });

  const verified = verifyPairCode(code);
  if (!verified.ok) return res.status(400).json({ error: verified.error });

  const ent = await getEntitlement(verified.payload.sub);
  if (!ent) return res.status(404).json({ error: 'entitlement-not-found' });
  if (ent.revoked) return res.status(403).json({ error: 'revoked' });
  if (ent.plan !== verified.payload.plan) return res.status(403).json({ error: 'plan-mismatch' });

  try {
    await upsertEntitlement({
      sub: ent.sub,
      plan: ent.plan,
      expiresAt: ent.expiresAt,
      devicePub,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'device-limit') return res.status(403).json({ error: 'device-limit' });
    if (msg === 'revoked') return res.status(403).json({ error: 'revoked' });
    return res.status(500).json({ error: 'pair-failed' });
  }

  const token = createAccessToken(
    { sub: ent.sub, device_id: deviceId, device_pub: devicePub, plan: ent.plan, exp: ent.expiresAt },
    getAccessTokenSecret()
  );

  return res.json({ token, payload: { sub: ent.sub, device_id: deviceId, plan: ent.plan, exp: ent.expiresAt } });
});

export default router;
