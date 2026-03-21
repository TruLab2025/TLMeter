import crypto from 'crypto';
import { getAccessTokenSecret, type AccessPlan } from './token';

export type PairCodePayloadV1 = {
  v: 1;
  sub: string;
  plan: AccessPlan;
  exp: number; // unix seconds
};

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
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

export function createPairCode(payload: Omit<PairCodePayloadV1, 'v'>): string {
  const body: PairCodePayloadV1 = { v: 1, ...payload };
  const json = JSON.stringify(body);
  const p = base64UrlEncode(json);
  const sig = crypto.createHmac('sha256', getAccessTokenSecret()).update(p).digest();
  return `PAIR1_${p}.${base64UrlEncode(sig)}`;
}

export function verifyPairCode(code: string): { ok: true; payload: PairCodePayloadV1 } | { ok: false; error: string } {
  if (!code || typeof code !== 'string' || code.length > 2048) return { ok: false, error: 'missing-code' };
  const raw = code.startsWith('PAIR1_') ? code.slice('PAIR1_'.length) : code;
  const dot = raw.indexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return { ok: false, error: 'invalid-code-format' };
  const p = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);

  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, error: 'invalid-code-sig' };
  }
  const expectedSig = crypto.createHmac('sha256', getAccessTokenSecret()).update(p).digest();
  if (providedSig.length !== expectedSig.length) return { ok: false, error: 'invalid-code-sig' };
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return { ok: false, error: 'invalid-code-sig' };

  const decoded = safeJsonParse(base64UrlDecode(p).toString('utf8'));
  if (!decoded || typeof decoded !== 'object') return { ok: false, error: 'invalid-code-payload' };
  const maybe = decoded as Partial<PairCodePayloadV1>;
  if (maybe.v !== 1) return { ok: false, error: 'invalid-code-version' };
  if (typeof maybe.sub !== 'string' || maybe.sub.length < 8) return { ok: false, error: 'invalid-sub' };
  if (maybe.plan !== 'lite' && maybe.plan !== 'pro' && maybe.plan !== 'premium') return { ok: false, error: 'invalid-plan' };
  if (typeof maybe.exp !== 'number' || !Number.isFinite(maybe.exp)) return { ok: false, error: 'invalid-exp' };

  const now = Math.floor(Date.now() / 1000);
  if (now > maybe.exp) return { ok: false, error: 'expired' };

  return { ok: true, payload: { v: 1, sub: maybe.sub, plan: maybe.plan, exp: maybe.exp } };
}

