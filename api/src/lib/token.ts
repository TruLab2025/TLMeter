import crypto from 'crypto';

export type AccessPlan = 'lite' | 'pro' | 'premium';

export type AccessTokenPayload = {
  sub: string;
  device_id: string;
  plan: AccessPlan;
  exp: number; // unix timestamp (seconds)
  device_pub?: string; // base64url SPKI (P-256)
};

let devFallbackSecret: string | null = null;

export function getAccessTokenSecret(): string {
  const configured = process.env.LICENSE_TOKEN_SECRET;
  if (configured && configured.trim().length > 0) return configured.trim();

  if (process.env.NODE_ENV === 'production') {
    throw new Error('LICENSE_TOKEN_SECRET is required in production');
  }

  if (!devFallbackSecret) {
    devFallbackSecret = crypto.randomBytes(32).toString('hex');
    // eslint-disable-next-line no-console
    console.warn('[license] LICENSE_TOKEN_SECRET missing; using ephemeral dev secret');
  }
  return devFallbackSecret;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

export function createAccessToken(payload: AccessTokenPayload, secret: string): string {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export type VerifyResult =
  | { ok: true; payload: AccessTokenPayload }
  | { ok: false; error: string };

export function verifyAccessToken(
  token: string,
  secret: string,
  expectedDeviceId: string
): VerifyResult {
  if (!token || typeof token !== 'string' || token.length > 4096) {
    return { ok: false, error: 'missing-token' };
  }

  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) {
    return { ok: false, error: 'invalid-format' };
  }

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, error: 'invalid-signature-encoding' };
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  if (providedSig.length !== expectedSig.length) {
    return { ok: false, error: 'invalid-signature' };
  }
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, error: 'invalid-signature' };
  }

  let payloadRaw: Buffer;
  try {
    payloadRaw = base64UrlDecode(payloadB64);
  } catch {
    return { ok: false, error: 'invalid-payload-encoding' };
  }

  const decoded = safeJsonParse(payloadRaw.toString('utf8'));
  if (!decoded || typeof decoded !== 'object') {
    return { ok: false, error: 'invalid-payload' };
  }

  const maybe = decoded as Partial<AccessTokenPayload>;
  if (typeof maybe.sub !== 'string' || maybe.sub.length < 8 || maybe.sub.length > 128) {
    return { ok: false, error: 'invalid-sub' };
  }
  if (typeof maybe.device_id !== 'string' || maybe.device_id.length < 8 || maybe.device_id.length > 128) {
    return { ok: false, error: 'invalid-device-id' };
  }
  if (maybe.device_id !== expectedDeviceId) {
    return { ok: false, error: 'device-mismatch' };
  }
  if (maybe.plan !== 'lite' && maybe.plan !== 'pro' && maybe.plan !== 'premium') {
    return { ok: false, error: 'invalid-plan' };
  }
  if (typeof maybe.exp !== 'number' || !Number.isFinite(maybe.exp)) {
    return { ok: false, error: 'invalid-exp' };
  }

  if (typeof maybe.device_pub !== 'undefined') {
    if (typeof maybe.device_pub !== 'string' || maybe.device_pub.length < 40 || maybe.device_pub.length > 2048) {
      return { ok: false, error: 'invalid-device-pub' };
    }
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec > maybe.exp) {
    return { ok: false, error: 'expired' };
  }

  return {
    ok: true,
    payload: {
      sub: maybe.sub,
      device_id: maybe.device_id,
      plan: maybe.plan,
      exp: maybe.exp,
      ...(maybe.device_pub ? { device_pub: maybe.device_pub } : {}),
    },
  };
}
