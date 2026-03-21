import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { AccessPlan, AccessTokenPayload } from '../lib/token';

export type EntitlementRecord = {
  sub: string;
  plan: AccessPlan;
  expiresAt: number; // unix seconds
  maxDevices: number;
  devices: string[]; // device_pub (base64url spki)
  revoked?: boolean;
  updatedAt: number; // unix seconds
};

function planDeviceLimit(plan: AccessPlan): number {
  if (plan === 'premium') return 3;
  if (plan === 'pro') return 2;
  return 1;
}

function storeDir(): string {
  return (process.env.LICENSE_STORE_DIR || '').trim() || path.join(process.cwd(), '.license-store');
}

function safeSubFile(sub: string): string {
  // sub is already hashed; keep it filesystem-safe anyway
  const safe = sub.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return path.join(storeDir(), `${safe}.json`);
}

async function ensureDir() {
  await fs.mkdir(storeDir(), { recursive: true });
}

async function readJsonFile(filePath: string): Promise<EntitlementRecord | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as EntitlementRecord;
  } catch {
    return null;
  }
}

async function writeAtomic(filePath: string, content: string) {
  await ensureDir();
  const tmp = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}

export function deriveSubIdFromEmail(email: string): string {
  const normalized = String(email || '').trim().toLowerCase();
  const secret = (process.env.LICENSE_SUB_SECRET || process.env.LICENSE_TOKEN_SECRET || '').trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('LICENSE_TOKEN_SECRET (or LICENSE_SUB_SECRET) is required');
    }
  }
  const hash = crypto.createHmac('sha256', secret || 'dev').update(normalized).digest('base64url');
  return `sub_${hash.slice(0, 43)}`;
}

export function deriveDevSubId(devicePub: string): string {
  const hash = crypto.createHash('sha256').update(devicePub).digest('base64url');
  return `dev_${hash.slice(0, 43)}`;
}

export async function getEntitlement(sub: string): Promise<EntitlementRecord | null> {
  const filePath = safeSubFile(sub);
  return readJsonFile(filePath);
}

export async function upsertEntitlement(params: {
  sub: string;
  plan: AccessPlan;
  expiresAt: number;
  devicePub: string;
}): Promise<EntitlementRecord> {
  const now = Math.floor(Date.now() / 1000);
  const filePath = safeSubFile(params.sub);
  const current = await readJsonFile(filePath);
  const maxDevices = planDeviceLimit(params.plan);

  if (current?.revoked) {
    throw new Error('revoked');
  }

  const next: EntitlementRecord = current
    ? {
        ...current,
        plan: params.plan,
        expiresAt: Math.max(current.expiresAt || 0, params.expiresAt),
        maxDevices,
        updatedAt: now,
      }
    : {
        sub: params.sub,
        plan: params.plan,
        expiresAt: params.expiresAt,
        maxDevices,
        devices: [],
        updatedAt: now,
      };

  if (!next.devices.includes(params.devicePub)) {
    if (next.devices.length >= next.maxDevices) {
      throw new Error('device-limit');
    }
    next.devices = [...next.devices, params.devicePub];
  }

  await writeAtomic(filePath, JSON.stringify(next, null, 2));
  return next;
}

export async function assertEntitlementAllows(payload: AccessTokenPayload): Promise<{ ok: true; entitlement: EntitlementRecord } | { ok: false; error: string }> {
  const sub = (payload as AccessTokenPayload & { sub?: string }).sub;
  const devicePub = payload.device_pub;
  if (!sub || typeof sub !== 'string') return { ok: false, error: 'missing-sub' };
  if (!devicePub) return { ok: false, error: 'missing-device-pub' };

  const ent = await getEntitlement(sub);
  if (!ent) return { ok: false, error: 'entitlement-not-found' };
  if (ent.revoked) return { ok: false, error: 'revoked' };

  const now = Math.floor(Date.now() / 1000);
  if (now > ent.expiresAt) return { ok: false, error: 'expired' };

  if (ent.plan !== payload.plan) return { ok: false, error: 'plan-mismatch' };
  if (!ent.devices.includes(devicePub)) return { ok: false, error: 'device-not-registered' };

  return { ok: true, entitlement: ent };
}

