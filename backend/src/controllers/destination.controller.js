/**
 * Destination controllers — thin HTTP layer over destination.service.js.
 *
 * Controllers here do four things and nothing else:
 *   - call exactly one service function
 *   - translate the result into the `{ success, message, data }` envelope
 *   - translate "not found" into a 404
 *   - pass the authenticated actor for audit attribution
 *
 * No business rules. No Firestore access. (PRD §62, §63;
 * REPOSITORY_ARCHITECTURE.contract.md §3)
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const destinationService = require('../services/destination.service');

/** GET /api/destinations — published only, bounded, cursor-paginated. */
const listPublic = asyncHandler(async (req, res) => {
  const result = await destinationService.listPublic({
    featured: req.query.featured,
    district: req.query.district,
    category: req.query.category,
    limit: req.query.limit,
    cursor: req.query.cursor,
    q: req.query.q,
  });

  return new ApiResponse(
    200,
    { items: result.items, nextCursor: result.nextCursor },
    'Destinations retrieved successfully'
  ).send(res);
});

/** GET /api/destinations/:slug */
const getPublic = asyncHandler(async (req, res) => {
  const destination = await destinationService.getPublicBySlug(req.params.slug);

  if (!destination) {
    // 404 for BOTH unknown and non-published slugs: a 403 here would
    // disclose that unpublished content exists.
    return new ApiResponse(404, null, 'Destination not found').send(res);
  }

  return new ApiResponse(200, { destination }, 'Destination retrieved successfully').send(res);
});

/** GET /api/admin/destinations — includes DRAFT and ARCHIVED. */
const listAdmin = asyncHandler(async (req, res) => {
  const result = await destinationService.listAdmin({
    status: req.query.status,
    limit: req.query.limit,
    // The response carries a `nextCursor`, so it must be accepted here too.
    cursor: req.query.cursor,
  });

  return new ApiResponse(
    200,
    { items: result.items, nextCursor: result.nextCursor },
    'Destinations retrieved successfully'
  ).send(res);
});

/** GET /api/admin/destinations/:id */
const getAdmin = asyncHandler(async (req, res) => {
  const destination = await destinationService.getAdminById(req.params.id);
  if (!destination) {
    return new ApiResponse(404, null, 'Destination not found').send(res);
  }
  return new ApiResponse(200, { destination }, 'Destination retrieved successfully').send(res);
});

/** POST /api/admin/destinations */
const create = asyncHandler(async (req, res) => {
  const destination = await destinationService.create(req.body, req.user);
  return new ApiResponse(201, { destination }, 'Destination created successfully').send(res);
});

/** PATCH /api/admin/destinations/:id */
const update = asyncHandler(async (req, res) => {
  const destination = await destinationService.update(req.params.id, req.body, req.user);
  return new ApiResponse(200, { destination }, 'Destination updated successfully').send(res);
});

/** POST /api/admin/destinations/:id/publish */
const publish = asyncHandler(async (req, res) => {
  const destination = await destinationService.setStatus(req.params.id, 'PUBLISHED', req.user);
  return new ApiResponse(200, { destination }, 'Destination published successfully').send(res);
});

/** POST /api/admin/destinations/:id/unpublish */
const unpublish = asyncHandler(async (req, res) => {
  const destination = await destinationService.setStatus(req.params.id, 'DRAFT', req.user);
  return new ApiResponse(200, { destination }, 'Destination unpublished successfully').send(res);
});

/** POST /api/admin/destinations/:id/archive */
const archive = asyncHandler(async (req, res) => {
  const destination = await destinationService.setStatus(req.params.id, 'ARCHIVED', req.user);
  return new ApiResponse(200, { destination }, 'Destination archived successfully').send(res);
});

/** POST /api/admin/destinations/:id/feature */
const feature = asyncHandler(async (req, res) => {
  const destination = await destinationService.setFeatured(
    req.params.id,
    req.body?.featured !== false,
    req.user
  );
  return new ApiResponse(200, { destination }, 'Destination featured successfully').send(res);
});

module.exports = {
  listPublic,
  getPublic,
  listAdmin,
  getAdmin,
  create,
  update,
  publish,
  unpublish,
  archive,
  feature,
};
