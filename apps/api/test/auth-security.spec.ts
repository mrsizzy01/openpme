import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, describe, it } from 'node:test';
import { AuthService } from '../src/modules/auth/auth.service';
import { getCorsOrigins, getJwtSecret } from '../src/common/config/security.config';
import { hashPassword, hashSessionToken, verifyPassword } from '../src/common/security/password';

const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;
const originalCorsOrigins = process.env.CORS_ORIGIN;
const testUser = {
  id: 'user-test',
  email: 'user@example.test',
  passwordHash: '',
  firstName: 'Test',
  lastName: 'User',
  role: 'MANAGER',
  organizationId: 'org-test',
  isActive: true,
  createdAt: new Date(),
  organization: {
    id: 'org-test',
    name: 'Test',
    isActive: true,
    settings: null,
    createdAt: new Date(),
  },
};

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalCorsOrigins === undefined) delete process.env.CORS_ORIGIN;
  else process.env.CORS_ORIGIN = originalCorsOrigins;
});

describe('security configuration', () => {
  it('rejects a missing JWT secret in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    assert.throws(() => getJwtSecret(), /JWT_SECRET is required in production/);
  });

  it('rejects weak configured JWT secrets', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'short';
    assert.throws(() => getJwtSecret(), /at least 32 characters/);
  });

  it('accepts a strong secret and restricts configured CORS origins', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(48);
    process.env.CORS_ORIGIN = 'https://app.example.test, https://admin.example.test';
    assert.equal(getJwtSecret(), 'a'.repeat(48));
    assert.deepEqual(getCorsOrigins(), ['https://app.example.test', 'https://admin.example.test']);
  });
});

describe('password hashing', () => {
  it('hashes new passwords with bcrypt and verifies them', async () => {
    const storedHash = await hashPassword('A strong temporary password');
    assert.match(storedHash, /^\$2[aby]\$/);
    assert.deepEqual(await verifyPassword('A strong temporary password', storedHash), { valid: true });
    assert.deepEqual(await verifyPassword('incorrect password', storedHash), { valid: false });
  });

  it('upgrades a valid legacy SHA-256 password hash', async () => {
    const legacyHash = createHash('sha256')
      .update('legacy-passwordsmart_pme_salt_2026')
      .digest('hex');
    const result = await verifyPassword('legacy-password', legacyHash);
    assert.equal(result.valid, true);
    assert.match(result.upgradedHash ?? '', /^\$2[aby]\$/);
    assert.deepEqual(await verifyPassword('wrong-password', legacyHash), { valid: false });
  });
});

describe('authentication sessions', () => {
  it('stores only hashed tokens and rotates refresh tokens', async () => {
    const user = { ...testUser, passwordHash: await hashPassword('password123') };
    const sessionCreate: { data?: any } = {};
    const sessionUpdate: { where?: any; data?: any } = {};
    const prisma = {
      user: {
        findUnique: async () => user,
        update: async () => user,
      },
      session: {
        create: async (args: any) => { sessionCreate.data = args.data; return args.data; },
        findUnique: async () => ({
          id: 'session-test',
          userId: user.id,
          refreshToken: sessionCreate.data?.refreshToken,
          revoked: false,
          expiresAt: new Date(Date.now() + 60_000),
          user,
        }),
        updateMany: async (args: any) => {
          sessionUpdate.where = args.where;
          sessionUpdate.data = args.data;
          return { count: 1 };
        },
      },
    };
    const jwt = { signAsync: async (payload: any) => `access-${payload.sid}-${Math.random()}` };
    const service = new AuthService(prisma as any, jwt as any);

    const login = await service.login({ email: user.email, password: 'password123' } as any);
    assert.ok(login.refreshToken);
    assert.equal(sessionCreate.data.refreshToken, hashSessionToken(login.refreshToken));
    assert.equal(sessionCreate.data.token, hashSessionToken(login.accessToken));
    assert.notEqual(sessionCreate.data.refreshToken, login.refreshToken);

    const rotated = await service.refreshSession(login.refreshToken);
    assert.notEqual(rotated.refreshToken, login.refreshToken);
    assert.equal(sessionUpdate.where.refreshToken, hashSessionToken(login.refreshToken));
    assert.equal(sessionUpdate.data.refreshToken, hashSessionToken(rotated.refreshToken));
  });

  it('revokes a session on logout without storing the raw refresh token', async () => {
    let update: any;
    const prisma = {
      session: {
        updateMany: async (args: any) => { update = args; return { count: 1 }; },
      },
    };
    const service = new AuthService(prisma as any, {} as any);
    await service.logout('opaque-refresh-token');
    assert.equal(update.where.refreshToken, hashSessionToken('opaque-refresh-token'));
    assert.equal(update.data.revoked, true);
  });
});
