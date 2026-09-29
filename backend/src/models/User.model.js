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
 * pass `{ includeSecrets: true }` explicitly.
 *
 * Additional fields beyond the PRD's list (carried over from the
 * pre-migration implementation for the same security reasons):
 *   - passwordResetExpires / emailVerificationExpires: tokens without an
 *     expiry are not safe to trust.
 *   - tokenVersion: incremented on password change / "log out everywhere",
 *     instantly invalidating every previously issued refresh token.
 *
 * Email uniqueness is enforced at the application layer: the document ID
 * IS the lowercased email address, which turns "does this email exist"
 * into a single point lookup with no query. Keying alone is not sufficient
 * to make duplicates impossible, though — two concurrent `set()` calls on
 * the same ID would silently overwrite each other — so `create()` performs
 * its existence check and its write inside a Firestore transaction. See
 * that function for the concurrency argument.
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

/**
 * Date fields held in the user document.
 *
 * Firestore returns Timestamp instances, which are not Date instances:
 * they lack getTime(), and JSON.stringify renders them as
 * `{_seconds, _nanoseconds}` rather than an ISO string. Normalising them
 * to Date at the model boundary means callers get a consistent type
 * (services compare against `new Date()`, and the API serialises cleanly).
 */
const DATE_FIELDS = Object.freeze([
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'emailVerificationExpires',
  'passwordResetExpires',
]);

/**
 * Converts Firestore Timestamps to Date. Also accepts Date, ISO strings
 * and epoch values so documents written by other tooling still load.
 */
function toDate(value) {
  if (!value) return value;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return value;
}

function normalizeDates(data) {
  for (const field of DATE_FIELDS) {
    if (data[field] !== undefined && data[field] !== null) {
      data[field] = toDate(data[field]);
    }
  }
  return data;
}

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
  const data = normalizeDates({ ...snapshot.data() });
  const base = { _id: snapshot.id, id: snapshot.id, ...data };
  return includeSecrets ? base : stripSecrets(base);
}

/**
 * @param {object} fields Must include `email`. `role`, `authProvider`,
 *   `emailVerified` and `status` default to the same safe values the
 *   pre-migration schema used.
 */
function duplicateEmailError() {
  // Carries code 11000 so middleware/errorHandler.js maps it to a 409
  // "record already exists" without any change to that translation logic.
  const error = new Error('A user with this email already exists');
  error.code = 11000;
  return error;
}

/**
 * Creates a user document, atomically.
 *
 * The existence check and the write happen inside a single Firestore
 * transaction. A read-then-write outside a transaction would let two
 * concurrent registrations for the same email both observe "does not
 * exist" and both proceed — and because the document ID *is* the email,
 * the second `set()` would silently overwrite the first account,
 * including its passwordHash and tokenVersion. Firestore retries
 * conflicting transactions internally, so after a retry the loser sees
 * the winner's document and aborts instead of clobbering it.
 *
 * The document-ID strategy is unchanged: the ID remains the lowercased
 * email address.
 */
async function create(fields) {
  if (!fields.email) {
    throw new Error('User.create requires an email');
  }
  const id = docId(fields.email);
  const db = getFirestore();

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

  return db.runTransaction(async (transaction) => {
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await transaction.get(ref);

    if (existing.exists) {
      // Abort before any write, so the existing account — including its
      // passwordHash, tokenVersion and any active verification/reset
      // token — is left completely untouched.
      throw duplicateEmailError();
    }

    transaction.set(ref, document);
    return toUser({ id, exists: true, data: () => document }, { includeSecrets: true });
  });
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
 * the future, so an expired token is treated exactly as "not found".
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
 * Partial update via a merge, so unspecified fields are preserved. Always
 * stamps `updatedAt`.
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
