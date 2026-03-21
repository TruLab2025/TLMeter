import crypto from 'crypto';
import { getAccessTokenSecret, type AccessPlan } from './token';

export type PaymentContextV1 = {
  v: 1;
  device_id: string;
  device_pub: string; // base64url SPKI (P-256)
  plan: AccessPlan;
  email: string;
  iat: number; // unix seconds
};

function getPaymentContextSecret(): string {
  return (process.env.PAYMENT_CONTEXT_SECRET || '').trim() || getAccessTokenSecret();
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

export function createPaymentContext(ctx: Omit<PaymentContextV1, 'v'>): string {
  const payload: PaymentContextV1 = { v: 1, ...ctx };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  const sig = crypto.createHmac('sha256', getPaymentContextSecret()).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `TLM1_${payloadB64}.${sigB64}`;
}

export type PaymentContextVerifyResult =
  | { ok: true; ctx: PaymentContextV1 }
  | { ok: false; error: string };

export function verifyPaymentContext(input: string): PaymentContextVerifyResult {
  if (!input || typeof input !== 'string' || input.length > 4096) return { ok: false, error: 'missing-context' };

  const raw = input.startsWith('TLM1_') ? input.slice('TLM1_'.length) : input;
  const dot = raw.indexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return { ok: false, error: 'invalid-context-format' };

  const payloadB64 = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);

  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, error: 'invalid-context-signature-encoding' };
  }

  const expectedSig = crypto.createHmac('sha256', getPaymentContextSecret()).update(payloadB64).digest();
  if (providedSig.length !== expectedSig.length) return { ok: false, error: 'invalid-context-signature' };
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return { ok: false, error: 'invalid-context-signature' };

  let payloadRaw: Buffer;
  try {
    payloadRaw = base64UrlDecode(payloadB64);
  } catch {
    return { ok: false, error: 'invalid-context-payload-encoding' };
  }

  const decoded = safeJsonParse(payloadRaw.toString('utf8'));
  if (!decoded || typeof decoded !== 'object') return { ok: false, error: 'invalid-context-payload' };
  const maybe = decoded as Partial<PaymentContextV1>;

  if (maybe.v !== 1) return { ok: false, error: 'unsupported-context-version' };
  if (typeof maybe.device_id !== 'string' || maybe.device_id.length < 8 || maybe.device_id.length > 128) {
    return { ok: false, error: 'invalid-device-id' };
  }
  if (typeof maybe.device_pub !== 'string' || maybe.device_pub.length < 40 || maybe.device_pub.length > 2048) {
    return { ok: false, error: 'invalid-device-pub' };
  }
  if (maybe.plan !== 'lite' && maybe.plan !== 'pro' && maybe.plan !== 'premium') {
    return { ok: false, error: 'invalid-plan' };
  }
  if (typeof maybe.email !== 'string' || maybe.email.length < 5 || maybe.email.length > 254) {
    return { ok: false, error: 'invalid-email' };
  }
  if (typeof maybe.iat !== 'number' || !Number.isFinite(maybe.iat)) {
    return { ok: false, error: 'invalid-iat' };
  }

  return {
    ok: true,
    ctx: {
      v: 1,
      device_id: maybe.device_id,
      device_pub: maybe.device_pub,
      plan: maybe.plan,
      email: maybe.email,
      iat: maybe.iat,
    },
  };
}
