import { randomBytes } from 'crypto';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../../../../../.env') });

let developmentJwtSecret: string | undefined;

export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET;
  if (configuredSecret) {
    if (configuredSecret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters.');
    }
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  if (!developmentJwtSecret) {
    developmentJwtSecret = randomBytes(48).toString('base64url');
    console.warn('JWT_SECRET is unset; using an ephemeral development key. Set JWT_SECRET to persist sessions across restarts.');
  }

  return developmentJwtSecret;
}

export function getCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGIN;
  if (configuredOrigins) {
    return configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be configured in production.');
  }

  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}
