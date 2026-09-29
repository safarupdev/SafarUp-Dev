/**
 * Authentication API tests — Phase 0.8 test foundation.
 *
 * Exercises the existing auth foundation end-to-end against the Express
 * app (supertest) and the Firestore emulator. This locks in the current
 * behaviour of the auth routes before Phase 3/4 work builds on them.
 *
 * The 7 scenarios the Phase 0 brief requires are covered:
 *   1. successful login          5. logout
 *   2. invalid login             6. role authorization
 *   3. protected route           7. /auth/me
 *   4. refresh token
 */

import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const request = require('supertest');
const bcrypt = require('bcryptjs');

const { requireEmulator, clearCollection, teardown } = require('./helpers/emulator.js');
const app = require('../src/app.js');
const User = require('../src/models/User.model.js');
const { ROLES } = require('../src/constants/roles.js');

const USERS = 'users';
const AUDIT_LOGS = 'auditLogs';

const CUSTOMER_EMAIL = 'customer@safarup.in';
const ADMIN_EMAIL = 'admin@safarup.in';
const PASSWORD = 'Password123';

/** Creates a verified user directly, bypassing the email-verification loop. */
async function seedUser({ email, role = ROLES.CUSTOMER, status = 'active', password = PASSWORD }) {
  return User.create({
    email,
    displayName: role,
    passwordHash: await bcrypt.hash(password, 4),
    role,
    emailVerified: true,
    status,
  });
}

/** Pulls a cookie by name from a supertest response. */
function cookie(response, name) {
  const raw = response.headers['set-cookie'] || [];
  const match = raw.find((c) => c.startsWith(`${name}=`));
  return match ? match.split(';')[0] : undefined;
}

beforeAll(async () => {
  await requireEmulator();
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  await clearCollection(USERS);
  await clearCollection(AUDIT_LOGS);
});

describe('1. successful login', () => {
  it('returns the user and sets httpOnly auth cookies', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(CUSTOMER_EMAIL);
    expect(res.body.data.user.role).toBe(ROLES.CUSTOMER);

    const setCookies = res.headers['set-cookie'] || [];
    expect(setCookies.some((c) => c.startsWith('accessToken=') && /HttpOnly/i.test(c))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('refreshToken=') && /HttpOnly/i.test(c))).toBe(true);
  });

  it('never returns the password hash or tokenVersion', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const res = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });

    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.tokenVersion).toBeUndefined();
  });
});

describe('2. invalid login', () => {
  it('rejects a wrong password with 401', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const res = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: 'WrongPass123' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@safarup.in', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('does not reveal whether the email exists (identical message)', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: 'WrongPass123' });
    const noSuchUser = await request(app).post('/api/auth/login').send({ email: 'nobody@safarup.in', password: PASSWORD });
    expect(wrongPassword.body.message).toBe(noSuchUser.body.message);
  });

  it('rejects an unverified email with 403', async () => {
    await User.create({
      email: 'unverified@safarup.in',
      displayName: 'Unverified',
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      emailVerified: false,
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'unverified@safarup.in', password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('rejects a suspended account with 403', async () => {
    await seedUser({ email: CUSTOMER_EMAIL, status: 'suspended' });
    const res = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe('3. protected route', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('accepts a valid access token via cookie', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const login = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie(login, 'accessToken'));
    expect(res.status).toBe(200);
  });

  it('accepts a valid access token via Authorization header', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const login = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    const accessToken = cookie(login, 'accessToken').split('=')[1];
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});

describe('4. refresh token', () => {
  it('exchanges a valid refresh cookie for a new session', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const login = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie(login, 'refreshToken'));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(CUSTOMER_EMAIL);
    expect((res.headers['set-cookie'] || []).some((c) => c.startsWith('accessToken='))).toBe(true);
  });

  it('rejects a refresh with no cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('rejects a refresh after the password is reset (tokenVersion bumped)', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const login = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });

    // Simulate what resetPassword does: bump tokenVersion.
    const user = await User.findOne({ email: CUSTOMER_EMAIL }, { includeSecrets: true });
    await User.updateById(user._id, { tokenVersion: (user.tokenVersion || 0) + 1 });

    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie(login, 'refreshToken'));
    expect(res.status).toBe(401);
  });
});

describe('5. logout', () => {
  it('expires the auth cookies so the browser stops sending them', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);

    const cleared = (res.headers['set-cookie'] || []).filter((c) =>
      /^(accessToken|refreshToken)=/.test(c)
    );
    expect(cleared).toHaveLength(2);
    // Express clears a cookie by sending it back with an expiry in the past.
    for (const c of cleared) {
      expect(c).toMatch(/Expires=Thu, 01 Jan 1970/i);
    }
  });
});

describe('6. role authorization (admin login)', () => {
  it('allows a staff user through /auth/admin/login', async () => {
    await seedUser({ email: ADMIN_EMAIL, role: ROLES.OPERATIONS });
    const res = await request(app).post('/api/auth/admin/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(ROLES.OPERATIONS);
  });

  it('rejects a CUSTOMER at the admin login with 401 (generic message)', async () => {
    await seedUser({ email: CUSTOMER_EMAIL, role: ROLES.CUSTOMER });
    const res = await request(app).post('/api/auth/admin/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    expect(res.status).toBe(401);
    // Must not reveal that the credential is valid but the portal is wrong.
    const wrongPassword = await request(app).post('/api/auth/admin/login').send({ email: CUSTOMER_EMAIL, password: 'WrongPass123' });
    expect(res.body.message).toBe(wrongPassword.body.message);
  });

  it('audit-logs an admin login success', async () => {
    await seedUser({ email: ADMIN_EMAIL, role: ROLES.OPERATIONS });
    await request(app).post('/api/auth/admin/login').send({ email: ADMIN_EMAIL, password: PASSWORD });

    const { getFirestore } = require('../src/config/database.js');
    const logs = await getFirestore().collection(AUDIT_LOGS).get();
    const success = logs.docs.map((d) => d.data()).find((l) => l.action === 'ADMIN_LOGIN_SUCCESS');
    expect(success).toBeTruthy();
    expect(success.actorRole).toBe(ROLES.OPERATIONS);
  });

  it('audit-logs a failed admin login attempt', async () => {
    await seedUser({ email: ADMIN_EMAIL, role: ROLES.OPERATIONS });
    await request(app).post('/api/auth/admin/login').send({ email: ADMIN_EMAIL, password: 'WrongPass123' });

    const { getFirestore } = require('../src/config/database.js');
    const logs = await getFirestore().collection(AUDIT_LOGS).get();
    const failure = logs.docs.map((d) => d.data()).find((l) => l.action === 'ADMIN_LOGIN_FAILED');
    expect(failure).toBeTruthy();
    expect(failure.actorRole).toBe('UNKNOWN');
    expect(failure.after.attemptedEmail).toBe(ADMIN_EMAIL);
  });
});

describe('7. /auth/me', () => {
  it('returns the authenticated user without secrets', async () => {
    await seedUser({ email: CUSTOMER_EMAIL });
    const login = await request(app).post('/api/auth/login').send({ email: CUSTOMER_EMAIL, password: PASSWORD });
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie(login, 'accessToken'));

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(CUSTOMER_EMAIL);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.tokenVersion).toBeUndefined();
  });
});

describe('input validation', () => {
  it('rejects a login with a malformed email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
