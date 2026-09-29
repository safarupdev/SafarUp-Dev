/**
 * Taxonomy controllers — thin HTTP layer for District, Category and Place.
 *
 * Same discipline as destination.controller.js: one service call per handler,
 * no business rules, no Firestore access.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { districtService, categoryService, placeService } = require('../services/taxonomy.service');

/** Builds the six standard handlers for one service + entity pair. */
function crudHandlers(service, entityLabel) {
  return {
    listPublic: asyncHandler(async (req, res) => {
      // `cursor` must be forwarded: the response carries a `nextCursor`, so a
      // client that cannot send it back could never reach page two.
      const result = await service.listPublic({ limit: req.query.limit, cursor: req.query.cursor });
      return new ApiResponse(200, result, `${entityLabel}s retrieved successfully`).send(res);
    }),

    getPublic: asyncHandler(async (req, res) => {
      const entity = await service.getPublicBySlug(req.params.slug);
      if (!entity) {
        // 404 for unknown AND unpublished — existence is not disclosed.
        return new ApiResponse(404, null, `${entityLabel} not found`).send(res);
      }
      return new ApiResponse(200, { [entityLabel.toLowerCase()]: entity }, `${entityLabel} retrieved successfully`).send(res);
    }),

    listAdmin: asyncHandler(async (req, res) => {
      const result = await service.list({
        status: req.query.status,
        limit: req.query.limit,
        cursor: req.query.cursor,
      });
      const items = Array.isArray(result) ? result : result.items;
      // Only cursor-paginated lists carry a nextCursor; adding the key to the
      // others would advertise pagination they do not implement.
      const payload =
        Array.isArray(result) || result.nextCursor === undefined ? { items } : { items, nextCursor: result.nextCursor };
      return new ApiResponse(200, payload, `${entityLabel}s retrieved successfully`).send(res);
    }),

    getAdmin: asyncHandler(async (req, res) => {
      const entity = await service.getAdminById(req.params.id);
      if (!entity) {
        return new ApiResponse(404, null, `${entityLabel} not found`).send(res);
      }
      return new ApiResponse(200, { [entityLabel.toLowerCase()]: entity }, `${entityLabel} retrieved successfully`).send(res);
    }),

    create: asyncHandler(async (req, res) => {
      const entity = await service.create(req.body, req.user);
      return new ApiResponse(201, { [entityLabel.toLowerCase()]: entity }, `${entityLabel} created successfully`).send(res);
    }),

    update: asyncHandler(async (req, res) => {
      const entity = await service.update(req.params.id, req.body, req.user);
      return new ApiResponse(200, { [entityLabel.toLowerCase()]: entity }, `${entityLabel} updated successfully`).send(res);
    }),

    publish: asyncHandler(async (req, res) => {
      const entity = await service.setStatus(req.params.id, 'PUBLISHED', req.user);
      return new ApiResponse(200, { [entityLabel.toLowerCase()]: entity }, `${entityLabel} published successfully`).send(res);
    }),

    unpublish: asyncHandler(async (req, res) => {
      const entity = await service.setStatus(req.params.id, 'DRAFT', req.user);
      return new ApiResponse(200, { [entityLabel.toLowerCase()]: entity }, `${entityLabel} unpublished successfully`).send(res);
    }),

    archive: asyncHandler(async (req, res) => {
      const entity = await service.setStatus(req.params.id, 'ARCHIVED', req.user);
      return new ApiResponse(200, { [entityLabel.toLowerCase()]: entity }, `${entityLabel} archived successfully`).send(res);
    }),
  };
}

const district = crudHandlers(districtService, 'District');
const category = crudHandlers(categoryService, 'Category');
const place = crudHandlers(placeService, 'Place');

/** Place list supports district/category filters (PRD §22 discovery). */
place.listPublic = asyncHandler(async (req, res) => {
  const result = await placeService.listPublic({
    district: req.query.district,
    category: req.query.category,
    limit: req.query.limit,
  });
  return new ApiResponse(200, result, 'Places retrieved successfully').send(res);
});

place.listAdmin = asyncHandler(async (req, res) => {
  const result = await placeService.list({
    status: req.query.status,
    district: req.query.district,
    category: req.query.category,
    limit: req.query.limit,
  });
  return new ApiResponse(200, result, 'Places retrieved successfully').send(res);
});

module.exports = { district, category, place };
