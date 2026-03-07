import { db } from './src/db/index.js';
import { licenses } from './src/db/schema.js';

const testCodes = [
  { id: 'test-premium-1', code: 'TEST-PREMIUM-8HKDM2NP', plan: 'premium', status: 'unused', device_limit: 3 },
  { id: 'test-premium-2', code: 'TEST-PREMIUM-9JXFP4QR', plan: 'premium', status: 'unused', device_limit: 3 },
  { id: 'test-pro-1', code: 'TEST-PRO-5GNLT8WK', plan: 'pro', status: 'unused', device_limit: 2 },
  { id: 'test-lite-1', code: 'TEST-LITE-3BVMR7ZH', plan: 'lite', status: 'unused', device_limit: 1 },
];

async function seed() {
  console.log('Dodawanie kodów testowych...');
  
  for (const code of testCodes) {
    try {
      await db.insert(licenses).values({
        ...code,
        email: null,
        fingerprint: null,
        activated_at: null,
        expires_at: null,
        stripe_session_id: null,
        created_at: new Date(),
      });
      console.log(`✅ ${code.code} (${code.plan})`);
    } catch (err) {
      console.log(`⚠️  ${code.code} - już istnieje lub błąd`);
    }
  }
  
  console.log('\n=== KODY GOTOWE DO UŻYCIA ===');
  testCodes.forEach(c => console.log(`${c.plan.toUpperCase()}: ${c.code}`));
  process.exit(0);
}

seed();
