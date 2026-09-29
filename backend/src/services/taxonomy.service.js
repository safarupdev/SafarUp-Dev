/**
 * Taxonomy service — District, Category and Place.
 *
 * These three share a lifecycle, a slug requirement and an audit pattern, so
 * they share one service module rather than three near-identical ones. The
 * repositories remain separate because their fields genuinely differ.
 *
 * Business rules enforced here:
 *   - only PUBLISHED entities are publicly readable (§63)
 *   - a Place must reference an existing District (§200.3)
 *   - lifecycle transitions and renames are audited (§59, §77)
 *   - there is no delete; archival is the only removal path (§78)
 */

const ApiError = require('../utils/ApiError');
const districtRepository = require('../repositories/district.repository');
const categoryRepository = require('../repositories/category.repository');
const placeRepository = require('../repositories/place.repository');

async function audit(entry) {
  const { recordAuditLog } = require('../utils/auditLog');
  return recordAuditLog(entry);
}

function actorFields(actor) {
  return { actorId: actor?.id ?? null, actorRole: actor?.role ?? 'UNKNOWN' };
}

// ---------------------------------------------------------------------------
// District
// ---------------------------------------------------------------------------

const districtService = {
  async create(fields, actor) {
    const created = await districtRepository.create(fields);
    await audit({
      ...actorFields(actor),
      action: 'DISTRICT_CREATED',
      entityType: 'District',
      entityId: created._id,
      after: { name: created.name, slug: created.slug, status: created.status },
    });
    return created;
  },

  async getPublicBySlug(slug) {
    const district = await districtRepository.findPublished(slug);
    if (!district) return null;
    return districtRepository.toPublic(district);
  },

  async getAdminById(id) {
    return districtRepository.get(id);
  },

  async list({ status, limit, cursor } = {}) {
    return districtRepository.list({ status, limit, cursor });
  },

  async listPublic({ limit, cursor } = {}) {
    // Anonymous callers never see anything but PUBLISHED districts (§63).
    const result = await districtRepository.list({ status: 'PUBLISHED', limit, cursor });
    return { items: result.items.map(districtRepository.toPublic), nextCursor: result.nextCursor };
  },

  async update(id, patch, actor) {
    const existing = await districtRepository.get(id);
    if (!existing) throw ApiError.notFound('District not found');

    const updated = await districtRepository.update(id, patch);
    await audit({
      ...actorFields(actor),
      action: 'DISTRICT_UPDATED',
      entityType: 'District',
      entityId: id,
      before: { name: existing.name, slug: existing.slug, status: existing.status },
      after: { name: updated.name, slug: updated.slug, status: updated.status },
    });
    return updated;
  },

  async setStatus(id, status, actor) {
    const existing = await districtRepository.get(id);
    if (!existing) throw ApiError.notFound('District not found');
    if (existing.status === status) return existing;

    return districtRepository.setStatus(id, status, actorFields(actor));
  },
};

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

const categoryService = {
  async create(fields, actor) {
    const created = await categoryRepository.create(fields);
    await audit({
      ...actorFields(actor),
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: created._id,
      after: { name: created.name, slug: created.slug, status: created.status },
    });
    return created;
  },

  async getPublicBySlug(slug) {
    const category = await categoryRepository.findPublished(slug);
    return category ? categoryRepository.toPublic(category) : null;
  },

  async getAdminById(id) {
    return categoryRepository.get(id);
  },

  async list({ status, limit } = {}) {
    return categoryRepository.list({ status, limit });
  },

  async listPublic({ limit } = {}) {
    const items = await categoryRepository.list({ status: 'PUBLISHED', limit });
    return { items: items.map(categoryRepository.toPublic) };
  },

  async update(id, patch, actor) {
    const existing = await categoryRepository.get(id);
    if (!existing) throw ApiError.notFound('Category not found');

    const updated = await categoryRepository.update(id, patch);
    await audit({
      ...actorFields(actor),
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      before: { name: existing.name, slug: existing.slug, sortOrder: existing.sortOrder },
      after: { name: updated.name, slug: updated.slug, sortOrder: updated.sortOrder },
    });
    return updated;
  },

  async setStatus(id, status, actor) {
    const existing = await categoryRepository.get(id);
    if (!existing) throw ApiError.notFound('Category not found');
    if (existing.status === status) return existing;

    return categoryRepository.setStatus(id, status, actorFields(actor));
  },
};

// ---------------------------------------------------------------------------
// Place
// ---------------------------------------------------------------------------

const placeService = {
  async create(fields, actor) {
    // A Place must belong to a real District — referential integrity before
    // the write, so a bad reference fails fast with a 400.
    const district = await districtRepository.get(fields.districtId);
    if (!district) {
      throw ApiError.badRequest('The specified district does not exist', {
        details: [{ field: 'districtId', message: 'Unknown district' }],
      });
    }

    const created = await placeRepository.create(fields);
    await audit({
      ...actorFields(actor),
      action: 'PLACE_CREATED',
      entityType: 'Place',
      entityId: created._id,
      after: { name: created.name, slug: created.slug, districtId: created.districtId },
    });
    return created;
  },

  async getPublicBySlug(slug) {
    const place = await placeRepository.findPublished(slug);
    if (!place) return null;

    const [district, categories] = await Promise.all([
      districtRepository.get(place.districtId),
      categoryRepository.getMany(place.categoryIds ?? []),
    ]);

    return {
      ...placeRepository.toPublic(place),
      district: district ? { id: district._id, slug: district.slug, name: district.name } : null,
      categories: [...categories.values()].map((c) => ({ id: c._id, slug: c.slug, name: c.name })),
    };
  },

  async getAdminById(id) {
    return placeRepository.get(id);
  },

  async list({ status, district, category, limit } = {}) {
    // An unresolvable filter is an empty set, never unfiltered data — and it
    // must keep the same `{ items }` shape as a populated page, or clients
    // reading `data.items` get `undefined` instead of an empty list.
    let districtId;
    if (district) {
      const found = await districtRepository.findPublished(district);
      if (!found) return { items: [] };
      districtId = found._id;
    }

    let categoryId;
    if (category) {
      const found = await categoryRepository.findPublished(category);
      if (!found) return { items: [] };
      categoryId = found._id;
    }

    const items = await placeRepository.list({ status, districtId, categoryId, limit });
    return { items };
  },

  async listPublic({ district, category, limit } = {}) {
    // The public list is the public projection; the admin list keeps the full
    // document so an editor can see DRAFT/ARCHIVED rows and their status.
    const result = await placeService.list({ status: 'PUBLISHED', district, category, limit });
    return { items: result.items.map(placeRepository.toPublic) };
  },

  async update(id, patch, actor) {
    const existing = await placeRepository.get(id);
    if (!existing) throw ApiError.notFound('Place not found');

    const districtId = patch.districtId ?? existing.districtId;
    const district = await districtRepository.get(districtId);
    if (!district) {
      throw ApiError.badRequest('The specified district does not exist', {
        details: [{ field: 'districtId', message: 'Unknown district' }],
      });
    }

    const updated = await placeRepository.update(id, patch);
    await audit({
      ...actorFields(actor),
      action: 'PLACE_UPDATED',
      entityType: 'Place',
      entityId: id,
      before: { name: existing.name, slug: existing.slug, districtId: existing.districtId },
      after: { name: updated.name, slug: updated.slug, districtId: updated.districtId },
    });
    return updated;
  },

  async setStatus(id, status, actor) {
    const existing = await placeRepository.get(id);
    if (!existing) throw ApiError.notFound('Place not found');
    if (existing.status === status) return existing;

    return placeRepository.setStatus(id, status, actorFields(actor));
  },
};

module.exports = { districtService, categoryService, placeService };
