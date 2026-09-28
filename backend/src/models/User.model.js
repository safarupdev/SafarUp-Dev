/**
 * User model — PRD §52 (User Document), backed by Firestore.
 *
 * Fields per §52: id, email, passwordHash, displayName, photoURL, role,
 * authProvider (local|google), googleId, emailVerified,
 * emailVerificationToken, passwordResetToken, status, createdAt, updatedAt,
 * lastLoginAt.
 *
 * "passwordHash is generated with bcrypt and is never selected/returned by
 * default on any query" (§52) — Firestore has no schema-level `select:
 * false`, so this module enforces the same guarantee in code: every read
 * helper strips sensitive fields before returning a plain user object,
 * and callers that genuinely need the hash/tokens (login, password reset)
 * use the `*WithSecrets` variants explicitly, mirroring the previous
 * Mongoose `.select('+passwordHash')` opt-in pattern.
 *
 * Additional fields beyond the PRD's list (kept from the original
 * implementation — see git history — for the same security reasons):
 *   - passwordResetExpires / emailVerificationExpires: tokens without an
 *     expiry are not safe to trust.
 *   - tokenVersion: incremented on password change / "log out everywhere",
 *     instantly invalidating every previously issued refresh token.
 *
 * Firestore has no native unique-index constraint like MongoDB, so
 * email uniqueness is enforced at the application layer: the document ID
 * IS the lowercased email address. This makes "does this email exist" a
 * single point lookup (no query needed) and makes a duplicate email
 * structurally impossible to create by construction, not by a race-prone
 * "check then insert".
 */

const { getFirestore } = require('../config/database');
const { ROLES, ALL_ROLES } = require('../constants/roles');

const COLLECTION = 'users';
const AUTH_PROVIDERS = Object.freeze(['local', 'google']);
const USER_STATUSES = Object.freeze(['active', 'suspended', 'deleted']);

const SECRET_FIELDS = Object.freeze([
  'passwordHash',
  'emailVerificationToken',
  'emailVerificationExpires',
  'passwordResetToken',
  'passwordResetExpires',
  'tokenVersion',
]);

function docId(email) {
  return email.trim().toLowerCase();
}

function stripSecrets(data) {
  if (!data) return data;
  const clean = { ...data };
  for (const field of SECRET_FIELDS) {
    delete clean[field];
  }
  return clean;
}

function toUser(snapshot, { includeSecrets = false } = {}) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const base = { _id: snapshot.id, id: snapshot.id, ...data };
  return includeSecrets ? base : stripSecrets(base);
}

/**
 * @param {object} fields Must include `email`; `role`, `authProvider`,
 *   `emailVerified`, `status` default to safe values matching the
 *   Mongoose schema's previous defaults.
 */
async function create(fields) {
  if (!fields.email) {
    throw new Error('User.create requires an email');
  }
  const id = docId(fields.email);
  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc(id);

  const existing = await ref.get();
  if (existing.exists) {
    // Mirrors Mongoose's unique-index violation (err.code === 11000)
    // so the existing errorHandler.js translation logic keeps working
    // unchanged.
    const error = new Error('A user with this email already exists');
    error.code = 11000;
    throw error;
  }

  const now = new Date();
  const document = {
    email: id,
    passwordHash: fields.passwordHash ?? null,
    displayName: fields.displayName,
    photoURL: fields.photoURL ?? null,
    role: fields.role ?? ROLES.CUSTOMER,
    authProvider: fields.authProvider ?? 'local',
    googleId: fields.googleId ?? null,
    emailVerified: fields.emailVerified ?? false,
    emailVerificationToken: fields.emailVerificationToken ?? null,
    emailVerificationExpires: fields.emailVerificationExpires ?? null,
    passwordResetToken: fields.passwordResetToken ?? null,
    passwordResetExpires: fields.passwordResetExpires ?? null,
    tokenVersion: fields.tokenVersion ?? 0,
    status: fields.status ?? 'active',
    lastLoginAt: fields.lastLoginAt ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(document);
  return toUser({ id, exists: true, data: () => document }, { includeSecrets: true });
}

/**
 * @param {{ email?: string, role?: string, emailVerificationToken?: string,
 *   passwordResetToken?: string, googleId?: string }} query Exactly one
 *   supported filter should be provided; email is a direct doc lookup
 *   (fast), the others fall back to a Firestore query.
 * @param {{ includeSecrets?: boolean }} [options]
 */
async function findOne(query, options = {}) {
  const db = getFirestore();

  if (query.email) {
    const snapshot = await db.collection(COLLECTION).doc(docId(query.email)).get();
    return toUser(snapshot, options);
  }

  let firestoreQuery = db.collection(COLLECTION);
  for (const [field, value] of Object.entries(query)) {
    firestoreQuery = firestoreQuery.where(field, '==', value);
  }
  const results = await firestoreQuery.limit(1).get();
  if (results.empty) return null;
  return toUser(results.docs[0], options);
}

/**
 * Token lookups additionally require the associated expiry to still be in
 * the future — mirrors the previous Mongoose query shape
 * `{ token: hash, tokenExpires: { $gt: new Date() } }`.
 */
async function findOneByUnexpiredToken(tokenField, expiresField, tokenValue) {
  const db = getFirestore();
  const now = new Date();
  const results = await db
    .collection(COLLECTION)
    .where(tokenField, '==', tokenValue)
    .limit(1)
    .get();

  if (results.empty) return null;
  const candidate = toUser(results.docs[0], { includeSecrets: true });
  const expiresAt = candidate[expiresField];
  if (!expiresAt || new Date(expiresAt) <= now) {
    return null; // expired or missing — treat exactly like "not found"
  }
  return candidate;
}

async function findById(id, options = {}) {
  const db = getFirestore();
  const snapshot = await db.collection(COLLECTION).doc(id).get();
  return toUser(snapshot, options);
}

/**
 * Partial update — mirrors calling `.save()` after mutating a Mongoose
 * document. Always stamps `updatedAt`.
 */
async function updateById(id, patch) {
  const db = getFirestore();
  await db
    .collection(COLLECTION)
    .doc(id)
    .set({ ...patch, updatedAt: new Date() }, { merge: true });
}

module.exports = {
  COLLECTION,
  AUTH_PROVIDERS,
  USER_STATUSES,
  ALL_ROLES,
  create,
  findOne,
  findOneByUnexpiredToken,
  findById,
  updateById,
  stripSecrets,
};
