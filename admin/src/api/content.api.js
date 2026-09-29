/**
 * Content API — Destination, District, Category and Place.
 *
 * Thin wrappers over the routes in `backend/src/routes/destination.routes.js`
 * and `backend/src/routes/taxonomy.routes.js`. Two mount points exist per
 * entity (API.destination.contract.md §2/§3):
 *
 *   public  /api/<entities>          anonymous, PUBLISHED content only
 *   admin   /api/admin/<entities>    authenticated, CONTENT+ (authorize())
 *
 * Every call reuses the single configured `apiClient` instance
 * (lib/apiClient.js) so the httpOnly-cookie credential and the transparent
 * 401→refresh-and-retry behaviour are not duplicated here.
 *
 * Notes that shape this module:
 *   - `?q=` is NOT offered. Phase 2 rejects it with a 400
 *     (API.destination.contract.md §2.1b) — search arrives in Phase 3.
 *   - There is no delete endpoint anywhere. Archival is the only removal
 *     path (PRD §78), so no `remove*` function exists in this file.
 *   - `feature` exists for Destinations only, and only for a PUBLISHED
 *     destination; the UI disables it otherwise rather than letting it 400.
 */

import { apiClient, unwrap } from '../lib/apiClient';

/** Path segments, matching the backend mount points exactly. */
export const CONTENT_ENTITIES = Object.freeze({
  destinations: 'destinations',
  districts: 'districts',
  categories: 'categories',
  places: 'places',
});

/**
 * Drops empty query values so the backend's Zod query schemas never receive
 * `undefined`/`''` for an optional parameter.
 */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

/**
 * Normalises every list response to one shape.
 *
 * Not all entities paginate: Destination and District return
 * `{ items, nextCursor }`; Category and Place return `{ items }` only. A
 * missing `nextCursor` is reported as `null`, so callers can test it without
 * caring which kind of list they received.
 */
async function fetchList(path, params) {
  const response = await apiClient.get(path, { params: cleanParams(params) });
  const data = unwrap(response);
  return {
    items: data?.items ?? [],
    nextCursor: data?.nextCursor ?? null,
  };
}

/** Detail responses are always `{ <entityKey>: entity }`. */
async function fetchOne(path, entityKey) {
  const response = await apiClient.get(path);
  return unwrap(response)?.[entityKey] ?? null;
}

/** Create/update responses are always `{ <entityKey>: entity }`. */
async function send(request) {
  const response = await request();
  const data = unwrap(response) ?? {};
  return data.destination ?? data.district ?? data.category ?? data.place ?? null;
}

// ---------------------------------------------------------------------------
// Public reads — anonymous, PUBLISHED content only (§63)
// ---------------------------------------------------------------------------

/**
 * @param {{ featured?: boolean, district?: string, category?: string|string[],
 *           limit?: number, cursor?: string }} params
 *   `category` may repeat; the backend merges one query per value.
 *   `q` is intentionally not accepted — see the module header.
 */
export function listPublicDestinations(params = {}) {
  return fetchList('/destinations', params);
}

export function getPublicDestination(slug) {
  return fetchOne(`/destinations/${encodeURIComponent(slug)}`, 'destination');
}

export function listPublicDistricts(params = {}) {
  return fetchList('/districts', params);
}

export function getPublicDistrict(slug) {
  return fetchOne(`/districts/${encodeURIComponent(slug)}`, 'district');
}

export function listPublicCategories(params = {}) {
  return fetchList('/categories', params);
}

export function getPublicCategory(slug) {
  return fetchOne(`/categories/${encodeURIComponent(slug)}`, 'category');
}

export function listPublicPlaces(params = {}) {
  return fetchList('/places', params);
}

export function getPublicPlace(slug) {
  return fetchOne(`/places/${encodeURIComponent(slug)}`, 'place');
}

// ---------------------------------------------------------------------------
// Admin reads — includes DRAFT and ARCHIVED
// ---------------------------------------------------------------------------

export function listAdminDestinations(params = {}) {
  return fetchList('/admin/destinations', params);
}

export function getAdminDestination(id) {
  return fetchOne(`/admin/destinations/${encodeURIComponent(id)}`, 'destination');
}

export function listAdminDistricts(params = {}) {
  return fetchList('/admin/districts', params);
}

export function getAdminDistrict(id) {
  return fetchOne(`/admin/districts/${encodeURIComponent(id)}`, 'district');
}

export function listAdminCategories(params = {}) {
  return fetchList('/admin/categories', params);
}

export function getAdminCategory(id) {
  return fetchOne(`/admin/categories/${encodeURIComponent(id)}`, 'category');
}

/**
 * The Place list filters by district/category **slug** (not ID), and the
 * backend resolves those slugs through the published-only lookup, so a
 * DRAFT/ARCHIVED district or category slug matches nothing.
 */
export function listAdminPlaces(params = {}) {
  return fetchList('/admin/places', params);
}

export function getAdminPlace(id) {
  return fetchOne(`/admin/places/${encodeURIComponent(id)}`, 'place');
}

// ---------------------------------------------------------------------------
// Admin writes
// ---------------------------------------------------------------------------

export function createDestination(payload) {
  return send(() => apiClient.post('/admin/destinations', payload));
}

export function updateDestination(id, patch) {
  return send(() => apiClient.patch(`/admin/destinations/${encodeURIComponent(id)}`, patch));
}

export function createDistrict(payload) {
  return send(() => apiClient.post('/admin/districts', payload));
}

export function updateDistrict(id, patch) {
  return send(() => apiClient.patch(`/admin/districts/${encodeURIComponent(id)}`, patch));
}

export function createCategory(payload) {
  return send(() => apiClient.post('/admin/categories', payload));
}

export function updateCategory(id, patch) {
  return send(() => apiClient.patch(`/admin/categories/${encodeURIComponent(id)}`, patch));
}

export function createPlace(payload) {
  return send(() => apiClient.post('/admin/places', payload));
}

export function updatePlace(id, patch) {
  return send(() => apiClient.patch(`/admin/places/${encodeURIComponent(id)}`, patch));
}

// ---------------------------------------------------------------------------
// Lifecycle — consequential: each call changes what the public internet sees
// ---------------------------------------------------------------------------

function postLifecycle(entity, id, action) {
  return send(() => apiClient.post(`/admin/${entity}/${encodeURIComponent(id)}/${action}`, {}));
}

export function publishDestination(id) {
  return postLifecycle('destinations', id, 'publish');
}

export function unpublishDestination(id) {
  return postLifecycle('destinations', id, 'unpublish');
}

export function archiveDestination(id) {
  return postLifecycle('destinations', id, 'archive');
}

/**
 * Toggles `featured` (homepage rail, §18). Destination only.
 * The backend answers 400 for a non-PUBLISHED destination — the UI disables
 * the control instead of letting the request fail.
 */
export function setDestinationFeatured(id, featured) {
  return send(() => apiClient.post(`/admin/destinations/${encodeURIComponent(id)}/feature`, { featured }));
}

export function publishDistrict(id) {
  return postLifecycle('districts', id, 'publish');
}

export function unpublishDistrict(id) {
  return postLifecycle('districts', id, 'unpublish');
}

export function archiveDistrict(id) {
  return postLifecycle('districts', id, 'archive');
}

export function publishCategory(id) {
  return postLifecycle('categories', id, 'publish');
}

export function unpublishCategory(id) {
  return postLifecycle('categories', id, 'unpublish');
}

export function archiveCategory(id) {
  return postLifecycle('categories', id, 'archive');
}

export function publishPlace(id) {
  return postLifecycle('places', id, 'publish');
}

export function unpublishPlace(id) {
  return postLifecycle('places', id, 'unpublish');
}

export function archivePlace(id) {
  return postLifecycle('places', id, 'archive');
}

const FEATURE_DISPATCH = {
  destinations: (id, options) => setDestinationFeatured(id, options.featured !== false),
};

const LIFECYCLE_DISPATCH = {
  destinations: { publish: publishDestination, unpublish: unpublishDestination, archive: archiveDestination },
  districts: { publish: publishDistrict, unpublish: unpublishDistrict, archive: archiveDistrict },
  categories: { publish: publishCategory, unpublish: unpublishCategory, archive: archiveCategory },
  places: { publish: publishPlace, unpublish: unpublishPlace, archive: archivePlace },
};

/**
 * Admin list fetchers keyed by entity path segment, so a generic screen can
 * ask for "the districts list" without branching on the entity.
 *
 * Pagination support differs and is a real API difference, not a UI choice:
 *   - destinations, districts → cursor paginated (`nextCursor`)
 *   - categories, places     → a single bounded page, no `nextCursor`
 */
export const ADMIN_LIST_BY_ENTITY = Object.freeze({
  destinations: listAdminDestinations,
  districts: listAdminDistricts,
  categories: listAdminCategories,
  places: listAdminPlaces,
});

/** Admin detail fetchers keyed by entity path segment. */
export const ADMIN_DETAIL_BY_ENTITY = Object.freeze({
  destinations: getAdminDestination,
  districts: getAdminDistrict,
  categories: getAdminCategory,
  places: getAdminPlace,
});


/**
 * Single entry point the lifecycle UI calls, so a screen never has to know
 * which entity it is managing.
 *
 * @param {'destinations'|'districts'|'categories'|'places'} entity
 * @param {string} id
 * @param {'publish'|'unpublish'|'archive'|'feature'} action
 * @param {{ featured?: boolean }} [options]
 */
export function runLifecycleAction(entity, id, action, options = {}) {
  if (action === 'feature') {
    const handler = FEATURE_DISPATCH[entity];
    if (!handler) {
      return Promise.reject(new Error(`Featuring is not supported for ${entity}`));
    }
    return handler(id, options);
  }

  const handler = LIFECYCLE_DISPATCH[entity]?.[action];
  if (!handler) {
    return Promise.reject(new Error(`Unsupported lifecycle action "${action}" for ${entity}`));
  }
  return handler(id);
}
