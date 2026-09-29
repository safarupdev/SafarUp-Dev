/**
 * Slug claim registry — PRD §51.3, `FIRESTORE.destination.contract.md` §3.
 *
 * Why this exists
 * ---------------
 * Public content entities are addressed by a readable `slug` (PRD §131).
 * Firestore offers no unique constraint on a non-ID field, and a
 * check-then-write is NOT atomic: two concurrent creates can both observe
 * "slug free" and both write.
 *
 * That is not hypothetical. `User.create()` originally did exactly this,
 * and a concurrent registration silently overwrote the first account's
 * `passwordHash` and `tokenVersion` — an account-takeover vector. The fix
 * was a Firestore transaction, and the regression test is in
 * `test/user.model.test.js`.
 *
 * How it works
 * ------------
 * The document ID *is* the slug string. A transaction may only read before
 * it writes, so "query all documents, scan for a matching slug, then
 * write" cannot be serialised against a concurrent transaction. A document
 * keyed by the slug turns the uniqueness check into a single point read
 * that the transaction engine serialises correctly.
 *
 * This is **infrastructure, not a business entity** (PRD §51.3): it carries
 * no product meaning, has no lifecycle, and is never exposed through any
 * API. It is shared across every slugged entity.
 */

const { getFirestore } = require('../config/database');

const COLLECTION = 'slugClaims';

/**
 * Duplicate error carrying `code: 11000` so the central error handler
 * (middleware/errorHandler.js) maps it to a 409 without any change to that
 * translation logic — the same convention models/User.model.js uses.
 */
function duplicateSlugError(slug) {
  const error = new Error(`The slug "${slug}" is already in use`);
  error.code = 11000;
  return error;
}

/** Normalises a slug to the exact form used as the claim key. */
function normalizeSlug(slug) {
  return String(slug).trim().toLowerCase();
}

/**
 * Claims `slug` for `entityId` **inside an existing transaction**.
 *
 * MUST be called with a live Firestore transaction and MUST be called
 * before the entity document is written in that same transaction, so the
 * claim and the entity can never disagree.
 *
 * @param {import('firebase-admin').firestore.Transaction} transaction
 * @param {{ slug: string, entityId: string, collection: string }} params
 * @returns {string} the normalized slug
 */
function claimSlug(transaction, { slug, entityId, collection }) {
  const normalized = normalizeSlug(slug);
  const claimRef = getFirestore().collection(COLLECTION).doc(normalized);

  return transaction.get(claimRef).then((existing) => {
    if (existing.exists) {
      // Abort before any write, so the existing entity is left untouched.
      throw duplicateSlugError(normalized);
    }
    transaction.set(claimRef, {
      entityId,
      collection,
      slug: normalized,
      createdAt: new Date(),
    });
    return normalized;
  });
}

/**
 * Releases a previously claimed slug inside an existing transaction.
 *
 * Required whenever a slug is changed: the old claim must be released in
 * the same transaction that claims the new slug, or the old value stays
 * permanently claimed and unusable. The *policy* for slug mutation is open
 * (PRD §200.8); this mechanical requirement is not optional.
 */
function releaseSlug(transaction, { slug }) {
  const normalized = normalizeSlug(slug);
  transaction.delete(getFirestore().collection(COLLECTION).doc(normalized));
  return normalized;
}

/**
 * Resolves a slug to the document ID that claimed it.
 *
 * @returns {Promise<{ entityId: string, collection: string } | null>}
 */
async function resolveSlug(slug) {
  if (!slug) return null;
  const snapshot = await getFirestore().collection(COLLECTION).doc(normalizeSlug(slug)).get();
  if (!snapshot.exists) return null;
  const { entityId, collection } = snapshot.data();
  return entityId ? { entityId, collection } : null;
}

module.exports = {
  COLLECTION,
  claimSlug,
  releaseSlug,
  resolveSlug,
  normalizeSlug,
  duplicateSlugError,
};
