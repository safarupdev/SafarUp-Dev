/**
 * User model tests — Phase 0.8 test foundation.
 *
 * These cover the data-access layer directly, including the concurrency
 * guarantee that `User.create()` was changed to provide.
 *
 * Vitest 2 is ESM-only, so this file uses ESM imports and `createRequire`
 * to load the CommonJS application modules. That keeps the tests
 * exercising the backend exactly as the server does, while still running
 * under Vitest. The test file itself is ESM because Vitest transforms it.
 */

import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const bcrypt = require('bcryptjs');

const { requireEmulator, clearCollection, teardown } = require('./helpers/emulator.js');
const User = require('../src/models/User.model.js');
const { hashToken } = require('../src/utils/hashToken.js');
const { ROLES } = require('../src/constants/roles.js');

const USERS = 'users';
const EMAIL = 'race-test@safarup.in';

async function hash(password) {
  return bcrypt.hash(password, 4);
}

beforeAll(async () => {
  await requireEmulator();
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  await clearCollection(USERS);
});

describe('User.create()', () => {
  it('creates a user keyed by normalized lowercase email', async () => {
    const user = await User.create({
      email: '  MixedCase@SafarUp.IN  ',
      displayName: 'Test Person',
      passwordHash: await hash('Password123'),
    });

    expect(user._id).toBe('mixedcase@safarup.in');
    expect(user.email).toBe('mixedcase@safarup.in');
    expect(user.role).toBe(ROLES.CUSTOMER);
    expect(user.status).toBe('active');
    expect(user.authProvider).toBe('local');
    expect(user.emailVerified).toBe(false);
    expect(user.tokenVersion).toBe(0);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('never returns secrets to the caller by default', async () => {
    await User.create({
      email: 'secretless@safarup.in',
      displayName: 'Secret Person',
      passwordHash: await hash('Password123'),
    });

    const user = await User.findOne({ email: 'secretless@safarup.in' });

    expect(user.passwordHash).toBeUndefined();
    expect(user.tokenVersion).toBeUndefined();
    expect(user.emailVerificationToken).toBeUndefined();
    expect(user.passwordResetToken).toBeUndefined();
  });

  it('returns secrets only when explicitly requested', async () => {
    await User.create({
      email: 'withsecrets@safarup.in',
      displayName: 'Hash Person',
      passwordHash: await hash('Password123'),
    });

    const user = await User.findOne({ email: 'withsecrets@safarup.in' }, { includeSecrets: true });

    expect(user.passwordHash).toBeTruthy();
    expect(user.tokenVersion).toBe(0);
  });

  it('rejects a duplicate email without overwriting the original account', async () => {
    const originalHash = await hash('OriginalPass123');
    await User.create({
      email: EMAIL,
      displayName: 'Original Owner',
      passwordHash: originalHash,
    });

    const attackerHash = await hash('AttackerPass123');
    await expect(
      User.create({
        email: EMAIL,
        displayName: 'Attacker',
        passwordHash: attackerHash,
      })
    ).rejects.toMatchObject({ code: 11000 });

    // The pre-existing account must be completely intact.
    const stored = await User.findOne({ email: EMAIL }, { includeSecrets: true });
    expect(stored.displayName).toBe('Original Owner');
    expect(stored.passwordHash).toBe(originalHash);
  });

  /**
   * Regression test for the Phase 0 bug: `create()` used to read-then-write
   * outside a transaction, so two concurrent registrations for the same
   * email could both observe "does not exist" and the second `set()` would
   * silently overwrite the first account's passwordHash and tokenVersion.
   */
  it('is concurrency-safe: two simultaneous creates yield exactly one winner', async () => {
    const [firstHash, secondHash] = await Promise.all([hash('FirstPass123'), hash('SecondPass123')]);

    const attempt = (passwordHash) =>
      User.create({ email: EMAIL, displayName: 'Concurrent', passwordHash });

    const results = await Promise.allSettled([attempt(firstHash), attempt(secondHash)]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: 11000 });

    // Whichever account survived, its stored password must be the one that
    // actually created it — never a mix, and never clobbered.
    const stored = await User.findOne({ email: EMAIL }, { includeSecrets: true });
    expect(stored).not.toBeNull();
    expect([firstHash, secondHash]).toContain(stored.passwordHash);
    expect(stored.tokenVersion).toBe(0);
  });
});

describe('User.findOne()', () => {
  beforeEach(async () => {
    await User.create({
      email: 'lookup@safarup.in',
      displayName: 'Lookup Target',
      passwordHash: await hash('Password123'),
      role: ROLES.OPERATIONS,
    });
  });

  it('finds a user by email via a direct document read', async () => {
    const user = await User.findOne({ email: 'lookup@safarup.in' });
    expect(user).not.toBeNull();
    expect(user.displayName).toBe('Lookup Target');
  });

  it('normalizes the lookup email', async () => {
    const user = await User.findOne({ email: '  LOOKUP@SAFARUP.IN ' });
    expect(user).not.toBeNull();
    expect(user._id).toBe('lookup@safarup.in');
  });

  it('returns null for an unknown email', async () => {
    expect(await User.findOne({ email: 'nobody@safarup.in' })).toBeNull();
  });

  it('supports a non-keyed field query', async () => {
    const user = await User.findOne({ role: ROLES.OPERATIONS });
    expect(user).not.toBeNull();
    expect(user.email).toBe('lookup@safarup.in');
  });
});

describe('User.findOneByUnexpiredToken()', () => {
  const TOKEN = 'raw-token-value';
  // Mirrors what auth.service.js stores: the emailed token is SHA-256
  // hashed before it is written, so lookups are by digest, never by the
  // raw value.
  const HASH = hashToken(TOKEN);

  it('finds a user when the token matches and has not expired', async () => {
    await User.create({
      email: 'token@safarup.in',
      displayName: 'Token User',
      passwordHash: await hash('Password123'),
      passwordResetToken: HASH,
      passwordResetExpires: new Date(Date.now() + 60_000),
    });

    const user = await User.findOneByUnexpiredToken(
      'passwordResetToken',
      'passwordResetExpires',
      HASH
    );

    expect(user).not.toBeNull();
    expect(user.email).toBe('token@safarup.in');
  });

  it('stores the hash, never the raw token', async () => {
    await User.create({
      email: 'hashed@safarup.in',
      displayName: 'Hashed Token',
      passwordHash: await hash('Password123'),
      passwordResetToken: HASH,
      passwordResetExpires: new Date(Date.now() + 60_000),
    });

    const stored = await User.findOne(
      { email: 'hashed@safarup.in' },
      { includeSecrets: true }
    );
    expect(stored.passwordResetToken).toBe(HASH);
    expect(stored.passwordResetToken).not.toBe(TOKEN);
  });

  it('returns null when the token has expired', async () => {
    await User.create({
      email: 'expired@safarup.in',
      displayName: 'Expired Token',
      passwordHash: await hash('Password123'),
      passwordResetToken: HASH,
      passwordResetExpires: new Date(Date.now() - 60_000),
    });

    const user = await User.findOneByUnexpiredToken(
      'passwordResetToken',
      'passwordResetExpires',
      HASH
    );

    expect(user).toBeNull();
  });

  it('returns null when the token does not match', async () => {
    await User.create({
      email: 'nomatch@safarup.in',
      displayName: 'No Match',
      passwordHash: await hash('Password123'),
      passwordResetToken: HASH,
      passwordResetExpires: new Date(Date.now() + 60_000),
    });

    const user = await User.findOneByUnexpiredToken(
      'passwordResetToken',
      'passwordResetExpires',
      'a-different-token'
    );

    expect(user).toBeNull();
  });
});

describe('User.updateById()', () => {
  it('merges the patch and preserves unspecified fields', async () => {
    const created = await User.create({
      email: 'update@safarup.in',
      displayName: 'Before',
      passwordHash: await hash('Password123'),
    });

    await User.updateById(created._id, { displayName: 'After' });

    const updated = await User.findOne({ email: 'update@safarup.in' }, { includeSecrets: true });
    expect(updated.displayName).toBe('After');
    // The password hash must survive a partial update.
    expect(updated.passwordHash).toBe(created.passwordHash);
  });

  it('stamps updatedAt', async () => {
    const created = await User.create({
      email: 'stamp@safarup.in',
      displayName: 'Stamp',
      passwordHash: await hash('Password123'),
    });

    await User.updateById(created._id, { displayName: 'Stamped' });

    const updated = await User.findOne({ email: 'stamp@safarup.in' }, { includeSecrets: true });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });
});
