import type { NextFunction, Request, Response } from 'express';

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) {
    return [
      'http://localhost:3000',
      'http://localhost:3002',
    ];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function requireAdminApiKey(req: Request, res: Response, next: NextFunction) {
  const configuredKey = process.env.ADMIN_API_KEY;

  if (!configuredKey) {
    if (isProduction()) {
      return res.status(500).json({ error: 'Server misconfiguration: ADMIN_API_KEY is required in production' });
    }
    return next();
  }

  const providedKey = req.header('x-admin-key');
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

export function requireDevelopmentOnly(req: Request, res: Response, next: NextFunction) {
  if (isProduction()) {
    return res.status(404).json({ error: 'Not found' });
  }
  return next();
}
