import type { NextFunction, Request, Response } from 'express';
import { getAccessTokenSecret, verifyAccessToken, type AccessTokenPayload } from '../lib/token';
import crypto from 'crypto';
import { assertEntitlementAllows } from '../services/entitlements';

export type AuthedRequest = Request & { access?: AccessTokenPayload };

function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1]?.trim() || null;
}

function base64UrlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

export function requireAccessToken(req: AuthedRequest, res: Response, next: NextFunction) {
  const deviceId = req.header('x-device-id');
  if (!deviceId) {
    return res.status(401).json({ error: 'missing-device-id' });
  }

  const token = extractBearerToken(req.header('authorization')) || '';
  const secret = getAccessTokenSecret();
  const result = verifyAccessToken(token, secret, deviceId);
  if (!result.ok) {
    return res.status(401).json({ error: result.error });
  }

  const requireProof = process.env.LICENSE_REQUIRE_PROOF === '1' || process.env.NODE_ENV === 'production';
  const devicePub = result.payload.device_pub;

  if (requireProof) {
    if (!devicePub) {
      return res.status(401).json({ error: 'missing-device-pub' });
    }

    const proof = req.header('x-proof') || '';
    const tsRaw = req.header('x-proof-ts') || '';
    const ts = Number(tsRaw);
    if (!proof || !Number.isFinite(ts)) {
      return res.status(401).json({ error: 'missing-proof' });
    }

    const now = Date.now();
    if (Math.abs(now - ts) > 60_000) {
      return res.status(401).json({ error: 'stale-proof' });
    }

    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody || Buffer.from('');
    const bodyHash = crypto.createHash('sha256').update(rawBody).digest('base64url');
    const path = (req.originalUrl || req.url || '').split('?')[0] || '';
    const message = `${ts}.${req.method.toUpperCase()}.${path}.${bodyHash}`;

    let publicKey: crypto.KeyObject;
    try {
      const der = base64UrlToBuffer(devicePub);
      publicKey = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    } catch {
      return res.status(401).json({ error: 'invalid-device-pub' });
    }

    let signature: Buffer;
    try {
      signature = base64UrlToBuffer(proof);
    } catch {
      return res.status(401).json({ error: 'invalid-proof' });
    }

    const ok = crypto.verify('sha256', Buffer.from(message, 'utf8'), publicKey, signature);
    if (!ok) {
      return res.status(401).json({ error: 'invalid-proof' });
    }
  }

  req.access = result.payload;

  const enforceEntitlement = process.env.LICENSE_ENFORCE_STORE !== '0';
  if (!enforceEntitlement) return next();

  void (async () => {
    const storeResult = await assertEntitlementAllows(result.payload);
    if (!storeResult.ok) {
      return res.status(401).json({ error: storeResult.error });
    }
    return next();
  })();
}
