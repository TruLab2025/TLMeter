import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const licenses = sqliteTable('licenses', {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    plan: text('plan').notNull(), // 'lite', 'pro', 'premium'
    status: text('status').default('unused'), // 'unused', 'active', 'revoked'
    email: text('email'),
    fingerprint: text('fingerprint'),
    device_limit: integer('device_limit').default(2),
    activated_at: integer('activated_at', { mode: 'timestamp' }),
    expires_at: integer('expires_at', { mode: 'timestamp' }),
    stripe_session_id: text('stripe_session_id'),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const licenseDevices = sqliteTable('license_devices', {
    id: text('id').primaryKey(),
    license_id: text('license_id').references(() => licenses.id),
    fingerprint: text('fingerprint').notNull(),
    user_agent: text('user_agent'),
    last_seen_at: integer('last_seen_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const analyses = sqliteTable('analyses', {
    id: text('id').primaryKey(),
    license_id: text('license_id').references(() => licenses.id), // null = free
    style: text('style').notNull(),
    filename: text('filename'),
    summary: text('summary', { mode: 'json' }), // stringified JSON
    full_data: text('full_data', { mode: 'json' }), // stringified JSON (Pro)
    score: integer('score'),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
