/**
 * Shared helpers for public content entities (District, Category, Place,
 * Destination).
 *
 * Every one of these entities has the same lifecycle (`DRAFT → PUBLISHED →
 * ARCHIVED`, PRD §78), the same slug-claiming requirement (§51.3), and the
 * same need to normalise Firestore `Timestamp` values to `Date` before they
 * reach a service or the API.
 *
 * This module holds that shared behaviour **once**. It is not a base class
 * and carries no business rules of its own — entity-specific rules stay in
 * their own repository.
 */

const { getFirestore } = require('../config/database');
const { claimSlug, releaseSlug, resolveSlug } = require('./slugClaim.repository');

/** Lifecycle values shared by every public content entity (PRD §38, §78). */
const CONTENT_STATUSES = Object.freeze(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

/** Default page size and hard ceiling for public list queries. */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Firestore returns `Timestamp` objects, which are not `Date`: they lack
 * `getTime()`, and `JSON.stringify` renders them as `{_seconds,
 * _nanoseconds}` instead of ISO 8601. Normalising at the data-access
 * boundary is a hard requirement established in Phase 0 — without it, API
 * responses serialise timestamps incorrectly and structured data breaks.
 */
const DATE_FIELDS = Object.freeze([
  'createdAt',
  'updatedAt',
  'publishedAt',
  'lastLoginAt',
  'emailVerificationExpires',
  'passwordResetExpires',
]);

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

/** Converts a Firestore snapshot into a plain, date-normalised object. */
function toEntity(snapshot) {
  if (!snapshot.exists) return null;
  return { _id: snapshot.id, id: snapshot.id, ...normalizeDates({ ...snapshot.data() }) };
}

function toEntities(snapshot) {
  return snapshot.docs.map((doc) => ({ _id: doc.id, id: doc.id, ...normalizeDates({ ...doc.data() }) }));
}

/** Clamps a caller-supplied limit into a safe, bounded range. */
function clampLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

/**
 * Opaque cursor: base64 of `"updatedAtMillis:documentId"`.
 *
 * Shared by every paginated content repository. The document ID is part of
 * the cursor so pages stay stable when two documents share an `updatedAt`
 * (which happens whenever several are written in the same millisecond) —
 * without it, a `startAfter` on the timestamp alone would skip or repeat
 * rows at a page boundary.
 *
 * A malformed cursor decodes to `null` rather than throwing: a stale or
 * hand-edited cursor must fail soft, not take down a public list route.
 */
function encodeCursor(date, id) {
  return Buffer.from(`${new Date(date).getTime()}:${id}`, 'utf8').toString('base64');
}

function decodeCursor(cursor) {
  try {
    const [updatedAt, id] = Buffer.from(cursor, 'base64').toString('utf8').split(':');
    if (!updatedAt || !id) return null;
    return { updatedAt: Number(updatedAt), id };
  } catch {
    return null;
  }
}

/**
 * Creates a document and atomically claims its slug, in one transaction.
 *
 * The claim and the entity write happen together so they can never
 * disagree: a failed claim writes nothing, and a written entity always has
 * a claim. See slugClaim.repository.js for why the transaction is required.
 *
 * @param {object} params
 * @param {string} params.collection Firestore collection name
 * @param {string} params.slug
 * @param {object} params.document entity fields (without system fields)
 */
async function createWithSlug({ collection, slug, document }) {
  const db = getFirestore();
  const ref = db.collection(collection).doc();
  const now = new Date();

  const id = await db.runTransaction(async (transaction) => {
    await claimSlug(transaction, { slug, entityId: ref.id, collection });
    transaction.set(ref, { ...document, createdAt: now, updatedAt: now });
    return ref.id;
  });

  return { _id: id, id, ...document, createdAt: now, updatedAt: now };
}

/**
 * Refuses a patch that attempts to change `slug`.
 *
 * Validation already omits `slug` from every PATCH schema, so this is
 * defence in depth: it makes the invariant impossible to violate from any
 * future call site, rather than dependent on every controller remembering the
 * rule. The throw is a 400 — a client mistake, not a server fault.
 *
 * When the slug-mutation policy (PRD §200.8) is approved, this guard is
 * replaced by a single transaction that calls `claimSlug` for the new value
 * and `releaseSlug` for the old one. Until then there is no supported way to
 * change a slug, so the safest available answer is to reject it.
 */
function assertSlugUnchanged(patch) {
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'slug')) {
    const err = new Error('Slug cannot be changed through a patch');
    err.statusCode = 400;
    err.code = 'SLUG_IMMUTABLE';
    throw err;
  }
}

/**
 * Applies a partial patch and stamps `updatedAt`.
 *
 * Merge semantics: unspecified fields are preserved.
 */
async function patchById(collection, id, patch) {
  assertSlugUnchanged(patch);
  const db = getFirestore();
  await db
    .collection(collection)
    .doc(id)
    .set({ ...patch, updatedAt: new Date() }, { merge: true });
}

/**
 * Applies a patch together with an audit entry in one batch, so a status
 * change can never be recorded without its audit trail (PRD §77).
 */
async function patchWithAudit({ collection, id, patch, entityType, action, actorId, actorRole, before, after }) {
  assertSlugUnchanged(patch);
  const db = getFirestore();
  const batch = db.batch();
  batch.set(db.collection(collection).doc(id), { ...patch, updatedAt: new Date() }, { merge: true });
  batch.set(db.collection('auditLogs').doc(), {
    actorId: actorId ?? null,
    actorRole: actorRole ?? 'UNKNOWN',
    action,
    entityType,
    entityId: id,
    before: before ?? null,
    after: after ?? null,
    timestamp: new Date(),
    ipMetadata: null,
  });
  await batch.commit();
}

/**
 * Resolves a public slug to an entity, **only if it is PUBLISHED**.
 *
 * A non-published or unknown slug both return `null`, so the caller answers
 * 404. Returning 403 for an unpublished slug would disclose that unpublished
 * content exists (API.destination.contract.md §2.2).
 */
async function findPublishedBySlug(collection, slug) {
  const claim = await resolveSlug(slug);
  if (!claim || claim.collection !== collection) return null;

  const snapshot = await getFirestore().collection(collection).doc(claim.entityId).get();
  const entity = toEntity(snapshot);
  return entity && entity.status === 'PUBLISHED' ? entity : null;
}

/** Resolves a slug regardless of status — for authenticated admin use. */
async function findBySlug(collection, slug) {
  const claim = await resolveSlug(slug);
  if (!claim || claim.collection !== collection) return null;
  const snapshot = await getFirestore().collection(collection).doc(claim.entityId).get();
  return toEntity(snapshot);
}

async function findById(collection, id) {
  const snapshot = await getFirestore().collection(collection).doc(id).get();
  return toEntity(snapshot);
}

/**
 * Resolves many entity IDs in ONE read and returns a Map keyed by ID.
 *
 * This is the concrete no-N+1 mechanism required by
 * FIRESTORE.destination.contract.md §5: a page rendering a list of
 * destinations resolves all their district/category/place references with a
 * single bounded read, never one read per ID.
 */
async function resolveMany(collection, ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  if (unique.length === 0) return new Map();

  // Chunked to respect Firestore's 30-operations-per-batch-free read size
  // for `in` queries, and to keep the read bounded.
  const CHUNK = 30;
  const results = new Map();

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const snapshot = await getFirestore().collection(collection).where('__name__', 'in', chunk).get();
    for (const entity of toEntities(snapshot)) {
      results.set(entity._id, entity);
    }
  }

  return results;
}

/**
 * Resolves many entity IDs to PUBLISHED entities only, in one batched read.
 *
 * `resolveMany` above is deliberately unfiltered because the Admin CMS must be
 * able to resolve a reference to a DRAFT or ARCHIVED entity. The public read
 * paths must not: an ARCHIVED Place referenced by a published Destination was
 * resolved by name and slug into the public payload and into
 * `includesAttraction` JSON-LD, disclosing content that was deliberately
 * withdrawn.
 *
 * The status filter is applied here, in the data-access layer, so every public
 * caller is protected by construction rather than by remembering to filter.
 * It is applied in JavaScript rather than as a Firestore `where` clause
 * deliberately: `__name__ IN` is served by the built-in `__name__` index
 * alone, whereas adding a second equality filter alongside it would make the
 * query depend on a composite index that cannot be verified outside a real
 * Firestore project. The read is already bounded to 30 IDs per chunk, so the
 * filter costs nothing measurable.
 *
 * Unresolved IDs are simply absent from the map, which is what every public
 * caller already handles for a missing reference.
 */
async function resolvePublishedMany(collection, ids) {
  const resolved = await resolveMany(collection, ids);
  const published = new Map();
  for (const [id, entity] of resolved) {
    if (entity && entity.status === 'PUBLISHED') published.set(id, entity);
  }
  return published;
}

module.exports = {
  CONTENT_STATUSES,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DATE_FIELDS,
  toDate,
  normalizeDates,
  toEntity,
  toEntities,
  clampLimit,
  encodeCursor,
  decodeCursor,
  createWithSlug,
  patchById,
  patchWithAudit,
  findPublishedBySlug,
  findBySlug,
  findById,
  resolveMany,
  resolvePublishedMany,
  claimSlug,
  releaseSlug,
};
