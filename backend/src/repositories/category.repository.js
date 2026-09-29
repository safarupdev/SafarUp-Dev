/**
 * Category repository — PRD §51.1, CATEGORY.domain.contract.md.
 *
 * A Category is a first-class, deliberately **flat** taxonomy entity.
 * Destination ↔ Category is **many-to-many** via `categoryIds[]`
 * (PRD §200.3). There is no `parentCategoryId` and no hierarchy.
 *
 * `sortOrder` is OPTIONAL and exists only to order Categories inside Explore
 * (PRD §115). Its absence is a valid state.
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
  toEntities,
  toEntity,
  clampLimit,
} = require('./content.repository');

const COLLECTION = 'categories';

function toDocument(fields) {
  return {
    name: fields.name,
    slug: fields.slug,
    status: fields.status ?? 'DRAFT',
    sortOrder: fields.sortOrder ?? null,
  };
}

function toPublic(category) {
  if (!category) return null;
  return {
    id: category._id,
    slug: category.slug,
    name: category.name,
    sortOrder: category.sortOrder ?? null,
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

/**
 * Bounded list. When `ordered` is true, sorts by `sortOrder` first so the
 * Explore ordering (PRD §115) is honoured; categories without a sortOrder
 * fall back to name order.
 */
async function list({ status, limit } = {}) {
  const db = getFirestore();
  const max = clampLimit(limit);

  let query = db.collection(COLLECTION);
  if (status) query = query.where('status', '==', status);
  query = query.orderBy('sortOrder', 'asc').orderBy('name', 'asc').limit(max);

  const snapshot = await query.get();
  return toEntities(snapshot);
}

async function displayRefsFor(ids) {
  const categories = await getMany(ids);
  return (ids || []).map((id) => {
    const category = categories.get(id);
    return category ? { id: category._id, slug: category.slug, name: category.name } : null;
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
    entityType: 'Category',
    action: `CATEGORY_${status}`,
    ...audit,
  });
  return get(id);
}

module.exports = {
  COLLECTION,
  create,
  get,
  getMany,
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
