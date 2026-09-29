/**
 * District repository — PRD §51.1, DISTRICT.domain.contract.md.
 *
 * A District is a first-class canonical geographic entity. Destinations
 * reference it 1:1 via `districtId`; a free-form `region` string is NOT the
 * canonical relationship (§51.2, superseded).
 *
 * Intentionally minimal: 8 fields. No coordinates, boundaries, population,
 * state or hierarchy — none have PRD support, and inventing them here would
 * be a contract violation, not a helpful default.
 */

const { getFirestore } = require('../config/database');
const {
  CONTENT_STATUSES,
  createWithSlug,
  findById,
  findBySlug,
  findPublishedBySlug,
  patchById,
  patchWithAudit,
  resolveMany,
  resolvePublishedMany,
  toEntity,
  clampLimit,
  encodeCursor,
  decodeCursor,
} = require('./content.repository');

const COLLECTION = 'districts';

/** Builds the stored document from validated input. */
function toDocument(fields) {
  return {
    name: fields.name,
    slug: fields.slug,
    status: fields.status ?? 'DRAFT',
  };
}

/** Public projection — excludes system/audit fields. */
function toPublic(district) {
  if (!district) return null;
  return {
    id: district._id,
    slug: district.slug,
    name: district.name,
    status: district.status,
    updatedAt: district.updatedAt,
  };
}

async function create(fields) {
  return createWithSlug({ collection: COLLECTION, slug: fields.slug, document: toDocument(fields) });
}

async function findPublished(slug) {
  return findPublishedBySlug(COLLECTION, slug);
}

async function findOneBySlug(slug) {
  return findBySlug(COLLECTION, slug);
}

async function get(id) {
  return findById(COLLECTION, id);
}

async function getMany(ids) {
  return resolveMany(COLLECTION, ids);
}

/** PUBLIC read path only — see `place.repository.js getManyPublished`. */
async function getManyPublished(ids) {
  return resolvePublishedMany(COLLECTION, ids);
}

/**
 * Bounded, cursor-paginated list. `status` is optional; omitting it returns
 * every status, which is correct for admin callers and must be filtered by
 * the service for public callers.
 *
 * The shape below is the one already proven in destination.repository.js and
 * it is deliberate: an optional `where` is only ever added when the value is
 * present (`where('status', '==', undefined)` is not a legal constraint), the
 * ordering is ALWAYS applied — a cursor that fails to decode must not silently
 * reorder the page — and the query always carries a `limit`.
 */
async function list({ status, limit, cursor } = {}) {
  const db = getFirestore();
  const max = clampLimit(limit);

  let query = db.collection(COLLECTION);
  if (status) query = query.where('status', '==', status);
  query = query.orderBy('updatedAt', 'desc').orderBy('__name__', 'desc');

  if (cursor) {
    // Opaque cursor: base64 of "updatedAtMillis:documentId". The document ID
    // is the tiebreaker, which is why `__name__` is ordered above.
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query = query.startAfter(new Date(decoded.updatedAt), decoded.id);
    }
  }

  // One document of lookahead. Without it, a page that happens to be exactly
  // full is indistinguishable from a page with more rows behind it, so the
  // list would hand out a cursor that leads to an empty second page.
  query = query.limit(max + 1);
  const snapshot = await query.get();

  const hasMore = snapshot.size > max;
  const docs = hasMore ? snapshot.docs.slice(0, max) : snapshot.docs;
  const items = docs.map((doc) => toEntity(doc));
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last._id) : null,
  };
}

/** Resolves the District name for display. Returns null when unresolved. */
async function displayNameFor(id) {
  if (!id) return null;
  const district = await get(id);
  return district ? { id: district._id, slug: district.slug, name: district.name } : null;
}

async function update(id, patch) {
  await patchById(COLLECTION, id, patch);
  return get(id);
}

async function setStatus(id, status, audit) {
  await patchWithAudit({
    collection: COLLECTION,
    id,
    patch: { status, ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}) },
    entityType: 'District',
    action: `DISTRICT_${status}`,
    ...audit,
  });
  return get(id);
}

module.exports = {
  COLLECTION,
  CONTENT_STATUSES,
  create,
  get,
  getMany,
  getManyPublished,
  findPublished,
  findOneBySlug,
  list,
  update,
  setStatus,
  displayNameFor,
  toDocument,
  toPublic,
  toEntity,
  encodeCursor,
  decodeCursor,
};
