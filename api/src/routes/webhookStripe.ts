import express from 'express';
import { createAccessToken, getAccessTokenSecret, type AccessPlan } from '../lib/token';
import { requireDevelopmentOnly } from '../middleware/security';
import { deriveSubIdFromEmail, upsertEntitlement } from '../services/entitlements';

const router = express.Router();

// DEV-ONLY example of a Stripe webhook handler.
// In production you MUST verify Stripe signatures and use real event schemas.
router.post('/stripe', requireDevelopmentOnly, express.json(), (req, res) => {
  const event = (req.body ?? {}) as {
    type?: string;
    data?: { object?: { metadata?: Record<string, string> } };
  };

  // Example: checkout.session.completed / invoice.paid etc.
  const type = String(event.type || '');
  const metadata = event.data?.object?.metadata || {};
  const deviceId = String(metadata.device_id || '');
  const devicePub = String(metadata.device_pub || '');
  const email = String(metadata.email || '');
  const requestedPlan = String(metadata.plan || 'pro');

  if (!deviceId) {
    return res.status(400).json({ error: 'missing-device-id' });
  }
  if (!devicePub) {
    return res.status(400).json({ error: 'missing-device-pub' });
  }
  if (!email) {
    return res.status(400).json({ error: 'missing-email' });
  }

  const plan: AccessPlan =
    requestedPlan === 'lite' || requestedPlan === 'premium' || requestedPlan === 'pro'
      ? requestedPlan
      : 'pro';

  // Only issue token for "successful payment" event types in real implementation.
  if (!type) {
    return res.status(400).json({ error: 'missing-event-type' });
  }

  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const sub = deriveSubIdFromEmail(email);
  void upsertEntitlement({ sub, plan, expiresAt: exp, devicePub: devicePub }).catch(() => null);
  const payload = { sub, device_id: deviceId, device_pub: devicePub, plan, exp };
  const token = createAccessToken(payload, getAccessTokenSecret());

  return res.json({ ok: true, token, payload });
});

export default router;
