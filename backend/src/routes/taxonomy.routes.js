/**
 * Taxonomy routes — District, Category, Place.
 *
 * Same two-mount-point pattern as destination.routes.js: public reads under
 * /api/<entity>, authenticated management under /api/admin/<entity>.
 */

const { Router } = require('express');

const { district, category, place } = require('../controllers/taxonomy.controller');
const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { publicReadLimiter, adminWriteLimiter } = require('../middleware/rateLimit');
const { ROLES } = require('../constants/roles');
const {
  districtBody,
  districtPatch,
  categoryBody,
  categoryPatch,
  placeBody,
  placePatch,
  placeListQuery,
  adminListQuery,
  districtListQuery,
  categoryListQuery,
  slugParam,
  idParam,
  validateBody,
  validateQuery,
  validateParams,
} = require('../validators/content.validator');

/** Taxonomy is content: Content and above. */
const CONTENT_ROLES = [ROLES.CONTENT, ROLES.OPERATIONS, ROLES.ADMIN, ROLES.SUPER_ADMIN];

/**
 * Builds the public + admin routers for one taxonomy entity.
 *
 * `entity` is the path segment the router answers under. The PUBLIC router is
 * mounted at `/<entity>` by routes/index.js, so its paths are relative (`/`,
 * `/:slug`). The ADMIN router is mounted at `/admin` alongside the other admin
 * routers, so it must carry the `<entity>` segment ITSELF — otherwise
 * `/api/admin/districts` would fall into `get('/:id')` with `id = 'districts'`
 * and every admin taxonomy route would answer 404.
 *
 * @param {string} entity path segment, e.g. `districts`
 * @param {object} handlers controller handler set
 * @param {object} schemas { body, patch, listQuery }
 */
function buildRouters(entity, handlers, schemas) {
  const publicRouter = Router();

  publicRouter.get('/', publicReadLimiter, validate(validateQuery(schemas.listQuery ?? adminListQuery)), handlers.listPublic);
  publicRouter.get('/:slug', publicReadLimiter, validate(validateParams(slugParam)), handlers.getPublic);

  const adminRouter = Router();

  // Authentication and role enforcement applied once for the whole subtree.
  adminRouter.use(authenticate, authorize(...CONTENT_ROLES));

  adminRouter.get(`/${entity}`, validate(validateQuery(schemas.listQuery ?? adminListQuery)), handlers.listAdmin);
  adminRouter.post(`/${entity}`, adminWriteLimiter, validate(validateBody(schemas.body)), handlers.create);
  adminRouter.get(`/${entity}/:id`, validate(validateParams(idParam)), handlers.getAdmin);
  adminRouter.patch(`/${entity}/:id`, adminWriteLimiter, validate(validateBody(schemas.patch)), handlers.update);
  adminRouter.post(`/${entity}/:id/publish`, adminWriteLimiter, validate(validateParams(idParam)), handlers.publish);
  adminRouter.post(`/${entity}/:id/unpublish`, adminWriteLimiter, validate(validateParams(idParam)), handlers.unpublish);
  adminRouter.post(`/${entity}/:id/archive`, adminWriteLimiter, validate(validateParams(idParam)), handlers.archive);

  return { publicRouter, adminRouter };
}

const districtRouters = buildRouters('districts', district, {
  body: districtBody,
  patch: districtPatch,
  listQuery: districtListQuery,
});
const categoryRouters = buildRouters('categories', category, {
  body: categoryBody,
  patch: categoryPatch,
  listQuery: categoryListQuery,
});
const placeRouters = buildRouters('places', place, {
  body: placeBody,
  patch: placePatch,
  listQuery: placeListQuery,
});

module.exports = {
  CONTENT_ROLES,
  district: districtRouters,
  category: categoryRouters,
  place: placeRouters,
};
