/**
 * Destination service — PRD §22, §38, DESTINATION.domain.contract.md.
 *
 * Business rules live here, not in the controller and not in the
 * repository. The service:
 *
 *   - assembles the public projection with relations resolved (§173)
 *   - enforces the PUBLISHED-only rule for anonymous callers (§63)
 *   - enforces that a DRAFT/ARCHIVED destination is never "featured" (§22)
 *   - rejects the unimplemented `q` search parameter explicitly (§200.8)
 *   - writes an audit trail for consequential mutations (§59, §77)
 */

const ApiError = require('../utils/ApiError');
const { clampLimit, encodeCursor } = require('../repositories/content.repository');
const destinationRepository = require('../repositories/destination.repository');
const districtRepository = require('../repositories/district.repository');
const categoryRepository = require('../repositories/category.repository');
const placeRepository = require('../repositories/place.repository');

/** Public projection — the exact shape fixed in API.destination.contract.md §2.2. */
function toPublicPayload(destination, relations) {
  return {
    id: destination._id,
    slug: destination.slug,
    name: destination.name,
    shortDescription: destination.shortDescription,
    description: destination.description,
    district: relations.district,
    categories: relations.categories,
    places: relations.places,
    highlights: destination.highlights ?? [],
    travelInformation: destination.travelInformation ?? {},
    heroImage: destination.heroImage,
    gallery: destination.gallery ?? [],
    status: destination.status,
    featured: destination.featured ?? false,
    seo: {
      title: destination.seoTitle,
      description: destination.metaDescription,
      canonicalUrl: destination.canonicalUrl,
      ogImage: destination.ogImage ?? destination.heroImage,
    },
    publishedAt: destination.publishedAt ?? null,
    updatedAt: destination.updatedAt ?? null,
  };
}

/** Admin projection — includes system/audit fields. */
function toAdminPayload(destination, relations) {
  return {
    ...destination,
    district: relations?.district ?? null,
    categories: relations?.categories ?? [],
    places: relations?.places ?? [],
  };
}

async function create(fields, actor) {
  // Referential integrity: a destination cannot point at a district or
  // category that does not exist. Verified before the write so a bad
  // reference fails fast with a clear 400 rather than persisting.
  await assertRelationsExist(fields);

  const created = await destinationRepository.create(fields);

  await recordAudit({
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? 'UNKNOWN',
    action: 'DESTINATION_CREATED',
    entityId: created._id,
    after: { name: created.name, slug: created.slug, status: created.status },
  });

  // Same representation the admin read returns, so a client never has to
  // re-fetch to learn whether its references resolved.
  return toAdminPayload(created, await destinationRepository.resolveRelations(created));
}

async function assertRelationsExist(fields) {
  if (fields.districtId) {
    const district = await districtRepository.get(fields.districtId);
    if (!district) {
      throw ApiError.badRequest('The specified district does not exist', {
        details: [{ field: 'districtId', message: 'Unknown district' }],
      });
    }
  }

  const categoryIds = fields.categoryIds ?? [];
  if (categoryIds.length > 0) {
    const categories = await categoryRepository.getMany(categoryIds);
    const missing = categoryIds.filter((id) => !categories.has(id));
    if (missing.length > 0) {
      throw ApiError.badRequest('One or more categories do not exist', {
        details: missing.map((id) => ({ field: 'categoryIds', message: `Unknown category: ${id}` })),
      });
    }
  }

  const placeIds = fields.placeIds ?? [];
  if (placeIds.length > 0) {
    const places = await placeRepository.getMany(placeIds);
    const missing = placeIds.filter((id) => !places.has(id));
    if (missing.length > 0) {
      throw ApiError.badRequest('One or more places do not exist', {
        details: missing.map((id) => ({ field: 'placeIds', message: `Unknown place: ${id}` })),
      });
    }
  }
}

/**
 * Public list. Publishes only PUBLISHED destinations.
 *
 * `q` is rejected with 400 rather than silently ignored — Firestore has no
 * native full-text search and returning unfiltered results for a search
 * query would misrepresent the result set (API.destination.contract.md §2.1b).
 */
async function listPublic(query = {}) {
  if (query.q) {
    throw ApiError.badRequest(
      'Search is not available yet. Filtering by district or category is supported.',
      { code: 'SEARCH_NOT_AVAILABLE' }
    );
  }

  const districtId = query.district ? await resolveDistrictId(query.district) : undefined;
  if (query.district && !districtId) {
    // Unknown district yields an empty set, not an error — a filter is not
    // a lookup failure.
    return { items: [], nextCursor: null };
  }

  // Multi-category: Firestore cannot intersect arrays, so issue one query
  // per category and merge. Deduped by ID and re-paginated.
  const categorySlugs = query.category ?? [];
  const categoryIds = [];
  for (const categorySlug of categorySlugs) {
    const id = await resolveCategoryId(categorySlug);
    if (id && !categoryIds.includes(id)) categoryIds.push(id);
  }

  if (categorySlugs.length > 0 && categoryIds.length === 0) {
    // A filter was asked for and none of it resolved. Returning the unfiltered
    // list here would silently misreport the result set, exactly like the
    // district case above.
    return { items: [], nextCursor: null };
  }

  // Clamp here rather than only inside the repository: the multi-category
  // path slices and compares against `pageSize` itself, so it must be the
  // same effective value the repository will use.
  const pageSize = clampLimit(query.limit);

  if (categoryIds.length === 0) {
    const result = await destinationRepository.list({
      status: 'PUBLISHED',
      featured: query.featured,
      districtId,
      limit: pageSize,
      cursor: query.cursor,
    });
    return decorate(result);
  }

  if (categoryIds.length === 1) {
    const result = await destinationRepository.list({
      status: 'PUBLISHED',
      featured: query.featured,
      districtId,
      categoryId: categoryIds[0],
      limit: pageSize,
      cursor: query.cursor,
    });
    return decorate(result);
  }

  // One query per category, each carrying the caller's cursor. Every query
  // applies the same `status`/`featured`/`districtId` filters, so the union
  // is the correct "matches ANY of these" result set and the cursor resumes
  // every query at the same point.
  const perQueryLimit = (pageSize + 1) * categoryIds.length;
  const merged = new Map();
  let saturated = false;

  for (const categoryId of categoryIds) {
    const result = await destinationRepository.list({
      status: 'PUBLISHED',
      featured: query.featured,
      districtId,
      categoryId,
      limit: perQueryLimit,
      cursor: query.cursor,
    });
    // Only load-bearing once `perQueryLimit` is clamped to MAX_LIMIT: a
    // saturated query can hold exactly `pageSize` rows that are all the same
    // rows, so the merge size alone would under-report.
    if (result.nextCursor) saturated = true;
    for (const item of result.items) merged.set(item._id, item);
  }

  // Same total order as the repository's `updatedAt DESC, __name__ DESC`, so
  // page boundaries agree with the single-category path.
  const ordered = [...merged.values()].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt) || (a._id < b._id ? 1 : a._id > b._id ? -1 : 0)
  );

  const hasMore = ordered.length > pageSize || saturated;
  const items = ordered.slice(0, pageSize);
  const last = items[items.length - 1];

  return decorate({
    items,
    nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last._id) : null,
  });
}

/**
 * Attaches district/category/place references in batched reads (no N+1).
 *
 * `resolveBatchReferences` issues ONE read per referenced collection for the
 * whole page, so 20 destinations cost 3 reads rather than 60.
 */
async function decorate(result) {
  const { resolveBatchReferences } = require('./destinationRelations');
  const rows = await resolveBatchReferences(result.items);
  return {
    items: rows.map((row) => toPublicPayload(row.destination, {
      district: row.district,
      categories: row.categories,
      places: row.places,
    })),
    nextCursor: result.nextCursor,
  };
}

/** Admin lists keep raw documents but still batch their references. */
async function decorateAdmin(result) {
  const { resolveBatchReferences } = require('./destinationRelations');
  const rows = await resolveBatchReferences(result.items);
  return {
    items: rows.map((row) => toAdminPayload(row.destination, {
      district: row.district,
      categories: row.categories,
      places: row.places,
    })),
    nextCursor: result.nextCursor,
  };
}

async function resolveDistrictId(districtSlug) {
  const district = await districtRepository.findPublished(districtSlug);
  return district ? district._id : null;
}

async function resolveCategoryId(categorySlug) {
  const category = await categoryRepository.findPublished(categorySlug);
  return category ? category._id : null;
}

/**
 * Public detail by slug. Returns null for unknown AND for non-published, so
 * the controller answers 404 in both cases and never discloses that
 * unpublished content exists.
 */
async function getPublicBySlug(slug) {
  const destination = await destinationRepository.findPublished(slug);
  if (!destination) return null;
  const relations = await destinationRepository.resolveRelations(destination, {
    publishedOnly: true,
  });
  return toPublicPayload(destination, relations);
}

async function getAdminById(id) {
  const destination = await destinationRepository.get(id);
  if (!destination) return null;
  const relations = await destinationRepository.resolveRelations(destination);
  return toAdminPayload(destination, relations);
}

async function listAdmin({ status, limit, cursor } = {}) {
  const result = await destinationRepository.list({ status, limit, cursor });
  return decorateAdmin(result);
}

async function update(id, patch, actor) {
  const existing = await destinationRepository.get(id);
  if (!existing) throw ApiError.notFound('Destination not found');

  if (patch.districtId || patch.categoryIds || patch.placeIds) {
    await assertRelationsExist({
      districtId: patch.districtId ?? existing.districtId,
      categoryIds: patch.categoryIds ?? existing.categoryIds,
      placeIds: patch.placeIds ?? existing.placeIds,
    });
  }

  const updated = await destinationRepository.update(id, patch);
  await recordAudit({
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? 'UNKNOWN',
    action: 'DESTINATION_UPDATED',
    entityId: id,
    before: pickAuditable(existing),
    after: pickAuditable(updated),
  });
  // Match `GET /api/admin/destinations/:id`: a PATCH must not return a
  // narrower shape than the read it updates.
  return toAdminPayload(updated, await destinationRepository.resolveRelations(updated));
}

/**
 * Lifecycle transition. Consequential — it changes what the public internet
 * can see — so it always writes an audit entry.
 */
async function setStatus(id, status, actor) {
  const existing = await destinationRepository.get(id);
  if (!existing) throw ApiError.notFound('Destination not found');

  if (existing.status === status) {
    // Idempotent by target state; no spurious audit noise.
    return existing;
  }

  // `featured` is orthogonal to status: publishing must not smuggle in a
  // featured flag, and unpublishing must not silently drop one.
  const updated = await destinationRepository.setStatus(id, status, {
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? 'UNKNOWN',
  });
  return updated;
}

async function setFeatured(id, featured, actor) {
  const existing = await destinationRepository.get(id);
  if (!existing) throw ApiError.notFound('Destination not found');

  if (existing.status !== 'PUBLISHED' && featured) {
    throw ApiError.badRequest('Only a published destination can be featured');
  }

  return destinationRepository.setFeatured(id, featured, {
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? 'UNKNOWN',
  });
}

function pickAuditable(destination) {
  return {
    name: destination.name,
    slug: destination.slug,
    status: destination.status,
    featured: destination.featured,
    districtId: destination.districtId,
    categoryIds: destination.categoryIds,
    placeIds: destination.placeIds,
    seoTitle: destination.seoTitle,
    metaDescription: destination.metaDescription,
    canonicalUrl: destination.canonicalUrl,
  };
}

/** Best-effort audit write; never fails the underlying operation. */
async function recordAudit(entry) {
  // Lazy require avoids a circular import at module load.
  const { recordAuditLog } = require('../utils/auditLog');
  return recordAuditLog({ ...entry, entityType: 'Destination' });
}

module.exports = {
  create,
  listPublic,
  getPublicBySlug,
  getAdminById,
  listAdmin,
  update,
  setStatus,
  setFeatured,
  toPublicPayload,
  toAdminPayload,
};
