/**
 * Destination repository — PRD §22, §38, DESTINATION.domain.contract.md.
 *
 * Destination is the canonical discovery and intent entity. It connects
 * editorial discovery, canonical places, commercial trips and private-trip
 * intent.
 *
 * Two structural rules this module enforces:
 *
 * 1. **It stores no arrays of trip or blog IDs.** Upcoming trips and blog
 *    articles are DERIVED by querying `tripTemplates` / `blogPosts` for
 *    documents whose `destinationId` points here (§22, §173). Denormalising
 *    those IDs would create two sources of truth.
 *
 * 2. **Relations are stored as IDs, resolved on read.** `districtId` is 1:1,
 *    `categoryIds[]` and `placeIds[]` are N:M. Resolution happens in the
 *    service, using batched reads — never one read per reference.
 */

const { getFirestore } = require('../config/database');
const {
  createWithSlug,
  findById,
  findBySlug,
  findPublishedBySlug,
  patchById,
  patchWithAudit,
  resolveMany,
  toEntity,
  clampLimit,
  encodeCursor,
  decodeCursor,
} = require('./content.repository');

const COLLECTION = 'destinations';

function toDocument(fields) {
  return {
    name: fields.name,
    slug: fields.slug,
    // Canonical geographic relationship — NOT a free-form region string
    // (PRD §51.2 superseded, §200.3).
    districtId: fields.districtId,
    // N:M taxonomy (PRD §200.3). An array, not a singular categoryId.
    categoryIds: fields.categoryIds ?? [],
    // N:M canonical places (§200.2). References, never copies (§186).
    placeIds: fields.placeIds ?? [],
    shortDescription: fields.shortDescription,
    description: fields.description,
    heroImage: fields.heroImage,
    gallery: fields.gallery ?? [],
    status: fields.status ?? 'DRAFT',
    // Orthogonal to status: a DRAFT/ARCHIVED destination must never appear
    // in a public featured rail, which the service enforces.
    featured: fields.featured ?? false,
    highlights: fields.highlights ?? [],
    travelInformation: fields.travelInformation ?? {},
    // `thingsToDo` is deliberately NOT written here — its structure is an
    // open decision (PRD §200.8). See services/destination.service.js.
    seoTitle: fields.seoTitle,
    metaDescription: fields.metaDescription,
    canonicalUrl: fields.canonicalUrl,
    ogImage: fields.ogImage ?? null,
  };
}

/**
 * Bounded, cursor-paginated list.
 *
 * Filters compose to indexed queries per
 * FIRESTORE.destination.contract.md §4:
 *   - `status` + `updatedAt DESC`  → published list
 *   - `status` + `featured`        → homepage rail
 *   - `districtId` + `status`      → district browse
 *   - `categoryIds` array-contains + `status` → N:M category filter
 *
 * Every supplied filter MUST reach the query. A filter the caller believes
 * is applied but that the query silently ignores returns a wrong result set
 * rather than an error, which is worse than not offering the filter at all.
 *
 * Multi-category filtering is NOT expressible as a single Firestore query
 * (no array intersection), so the service issues one query per category and
 * merges the results.
 */
async function list({ status, featured, districtId, categoryId, limit, cursor } = {}) {
  const db = getFirestore();
  const max = clampLimit(limit);

  /** Every filter, applied identically to the first page and to cursor pages. */
  const applyFilters = (base) => {
    let q = base;
    if (status) q = q.where('status', '==', status);
    if (featured !== undefined) q = q.where('featured', '==', featured);
    if (districtId) q = q.where('districtId', '==', districtId);
    if (categoryId) q = q.where('categoryIds', 'array-contains', categoryId);
    return q;
  };

  // Ordering is applied unconditionally. A cursor that fails to decode must
  // degrade to the first page, never to an unordered query (which would
  // silently return documents by document ID ascending instead).
  let query = applyFilters(db.collection(COLLECTION))
    .orderBy('updatedAt', 'desc')
    .orderBy('__name__', 'desc');

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      // Same filters, then start after the last document of the previous page.
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

async function create(fields) {
  return createWithSlug({ collection: COLLECTION, slug: fields.slug, document: toDocument(fields) });
}

async function get(id) {
  return findById(COLLECTION, id);
}

/** Public read. A non-published slug returns null → the caller answers 404. */
async function findPublished(slug) {
  return findPublishedBySlug(COLLECTION, slug);
}

/** Authenticated read by slug, regardless of status. */
async function findOneBySlug(slug) {
  return findBySlug(COLLECTION, slug);
}

/**
 * Resolves every reference on a destination in **three batched reads**
 * (one per collection) rather than N reads — the no-N+1 requirement of
 * FIRESTORE.destination.contract.md §5.
 */
async function resolveRelations(destination) {
  if (!destination) return null;

  const [district, categories, places] = await Promise.all([
    destination.districtId
      ? getFirestore().collection('districts').doc(destination.districtId).get()
      : Promise.resolve(null),
    (destination.categoryIds || []).length
      ? resolveMany('categories', destination.categoryIds)
      : Promise.resolve(new Map()),
    (destination.placeIds || []).length
      ? resolveMany('places', destination.placeIds)
      : Promise.resolve(new Map()),
  ]);

  return {
    district: district && district.exists
      ? { id: district.id, slug: district.data().slug, name: district.data().name }
      : null,
    categories: (destination.categoryIds || [])
      .map((id) => categories.get(id))
      .filter(Boolean)
      .map((c) => ({ id: c._id, slug: c.slug, name: c.name })),
    places: (destination.placeIds || [])
      .map((id) => places.get(id))
      .filter(Boolean)
      .map((p) => ({ id: p._id, slug: p.slug, name: p.name })),
  };
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
    entityType: 'Destination',
    action: `DESTINATION_${status}`,
    ...audit,
  });
  return get(id);
}

/** Toggles `featured`. Never publishes an unpublished destination. */
async function setFeatured(id, featured, audit) {
  const destination = await get(id);
  if (!destination) return null;

  await patchWithAudit({
    collection: COLLECTION,
    id,
    patch: { featured: Boolean(featured) },
    entityType: 'Destination',
    action: featured ? 'DESTINATION_FEATURED' : 'DESTINATION_UNFEATURED',
    before: { featured: destination.featured ?? false },
    after: { featured: Boolean(featured) },
    ...audit,
  });

  return get(id);
}

module.exports = {
  COLLECTION,
  create,
  get,
  list,
  findPublished,
  findOneBySlug,
  resolveRelations,
  update,
  setStatus,
  setFeatured,
  toDocument,
  toEntity,
};
