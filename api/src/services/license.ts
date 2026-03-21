import { db } from '../db/index';
import { licenses } from '../db/schema';
import crypto from 'crypto';

export function generateLicenseCode() {
    const bytes = crypto.randomBytes(9);
    return 'TRUL-' + bytes.toString('hex').match(/.{1,4}/g)?.join('-').toUpperCase().substring(0, 14);
}

export async function createLicense(plan: string, email: string, stripeSessionId?: string, deviceId?: string) {
    const code = generateLicenseCode();
    const deviceLimit = plan === 'premium' ? 3 : (plan === 'pro' ? 2 : 1);

    const id = crypto.randomUUID();

    await db.insert(licenses).values({
        id: id,
        code: code,
        plan: plan,
        status: 'unused',
        email: email,
        fingerprint: deviceId || null,
        device_limit: deviceLimit,
        stripe_session_id: stripeSessionId || null,
    });

    return { id, code, plan, email };
}
