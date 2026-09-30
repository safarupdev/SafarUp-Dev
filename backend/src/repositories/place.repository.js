/**
 * Place repository — PRD §51.1, §200.2, PLACE.domain.contract.md.
 *
 * A Place is a **first-class canonical entity** — a temple, a tower, a bird
 * sanctuary. Its whole purpose is to make duplication impossible: places are
 * *referenced* by Destination (`placeIds[]`) and by Trip itinerary stops,
 * never copied into those documents (§186).
 *
 * Deliberately minimal. Coordinates, opening hours, ticketing and similar
 * tourism attributes have **no PRD support** and are not invented here; the
 * field-level contract remains open (PRD §200.9).
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
  resolvePublishedMany,
  toEntities,
  toEntity,
  clampLimit,
} = require('./content.repository');

const COLLECTION = 'places';

function toDocument(fields) {
  return {
    name: fields.name,
    slug: fields.slug,
    districtId: fields.districtId,
    categoryIds: fields.categoryIds ?? [],
    description: fields.description,
    heroImage: fields.heroImage ?? null,
    status: fields.status ?? 'DRAFT',
    // SEO fields are OPTIONAL: a public Place page is not confirmed
    // (PRD §200.6), so they are only meaningful once it exists.
    seoTitle: fields.seoTitle ?? null,
    metaDescription: fields.metaDescription ?? null,
    canonicalUrl: fields.canonicalUrl ?? null,
  };
}

function toPublic(place) {
  if (!place) return null;
  return {
    id: place._id,
    slug: place.slug,
    name: place.name,
    districtId: place.districtId,
    categoryIds: place.categoryIds ?? [],
    description: place.description,
    heroImage: place.heroImage ?? null,
  };
}

/**
 * Lists places.
 *
 * `districtId` + `status` and `categoryIds` + `status` are composite-index
 * queries (FIRESTORE.place.contract.md §2). `categoryIds` is an array, so
 * this is an array-membership query and may over-return; it is therefore
 * always bounded.
 */
async function list({ status, districtId, categoryId, limit } = {}) {
  const db = getFirestore();
  const max = clampLimit(limit);

  const constraints = [];
  if (status) constraints.push(['status', '==', status]);
  if (districtId) constraints.push(['districtId', '==', districtId]);
  if (categoryId) constraints.push(['categoryIds', 'array-contains', categoryId]);

  let query = db.collection(COLLECTION);
  for (const [field, op, value] of constraints) {
    query = query.where(field, op, value);
  }
  query = query.orderBy('updatedAt', 'desc').limit(max);

  const snapshot = await query.get();
  return toEntities(snapshot);
}

async function create(fields) {
  return createWithSlug({ collection: COLLECTION, slug: fields.slug, document: toDocument(fields) });
}

async function get(id) {
  return findById(COLLECTION, id);
}

async function getMany(ids) {
  return resolveMany(COLLECTION, ids);
}

/**
 * Place resolution for PUBLIC read paths.
 *
 * `getMany` stays unfiltered because the Admin CMS must resolve a reference
 * to a DRAFT or ARCHIVED Place. Public payloads must not: an ARCHIVED Place
 * was previously resolved by name and slug into destination pages and
 * `includesAttraction` JSON-LD. Filtering lives in the data-access layer so
 * every public caller is protected by construction.
 */
async function getManyPublished(ids) {
  return resolvePublishedMany(COLLECTION, ids);
}

async function findPublished(slug) {
  return findPublishedBySlug(COLLECTION, slug);
}

async function findOneBySlug(slug) {
  return findBySlug(COLLECTION, slug);
}

/**
 * Resolves Place IDs to display references in ONE read.
 *
 * This is the no-N+1 mechanism for the Destination detail page: a page with
 * 12 places performs a single batched read, not 12 individual ones.
 */
async function displayRefsFor(ids) {
  const places = await getMany(ids);
  return (ids || []).map((id) => {
    const place = places.get(id);
    return place ? { id: place._id, slug: place.slug, name: place.name } : null;
  }).filter(Boolean);
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
    entityType: 'Place',
    action: `PLACE_${status}`,
    ...audit,
  });
  return get(id);
}

module.exports = {
  COLLECTION,
  create,
  get,
  getMany,
  getManyPublished,
  findPublished,
  findOneBySlug,
  list,
  update,
  setStatus,
  displayRefsFor,
  toDocument,
  toPublic,
  toEntity,
};
