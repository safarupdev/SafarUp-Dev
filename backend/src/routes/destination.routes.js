/**
 * Destination routes — PRD §22 (public), §38 (admin),
 * API.destination.contract.md.
 *
 * Two routers, because the contract specifies two different mount points:
 *
 *   public  → /api/destinations        /api/destinations/:slug
 *   admin   → /api/admin/destinations  /api/admin/destinations/:id
 *
 * This is the FIRST deployment of the `authorize()` middleware, which
 * existed but was wired to zero routes until Phase 2. Server-side role
 * enforcement is mandatory (PRD §60, §63): hiding a route in the UI is not
 * authorization.
 *
 * There is no DELETE endpoint. §78 forbids unnecessary deletion of
 * production content; archival is the only removal path.
 */

const { Router } = require('express');

const controller = require('../controllers/destination.controller');
const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { publicReadLimiter, adminWriteLimiter } = require('../middleware/rateLimit');
const { ROLES } = require('../constants/roles');
const {
  destinationBody,
  destinationPatch,
  destinationListQuery,
  adminListQuery,
  slugParam,
  idParam,
  validateBody,
  validateQuery,
  validateParams,
} = require('../validators/content.validator');

/** Roles permitted to manage destinations: Content and above. */
const CONTENT_ROLES = [ROLES.CONTENT, ROLES.OPERATIONS, ROLES.ADMIN, ROLES.SUPER_ADMIN];

// ---------------------------------------------------------------------------
// Public — anonymous access, PUBLISHED content only
// ---------------------------------------------------------------------------

const publicRouter = Router();

publicRouter.get('/', publicReadLimiter, validate(validateQuery(destinationListQuery)), controller.listPublic);
publicRouter.get('/:slug', publicReadLimiter, validate(validateParams(slugParam)), controller.getPublic);

// ---------------------------------------------------------------------------
// Admin — authenticated + role-authorized
// ---------------------------------------------------------------------------

const adminRouter = Router();

adminRouter.use(authenticate, authorize(...CONTENT_ROLES));

adminRouter.get('/destinations', validate(validateQuery(adminListQuery)), controller.listAdmin);
adminRouter.post('/destinations', adminWriteLimiter, validate(validateBody(destinationBody)), controller.create);
adminRouter.get('/destinations/:id', validate(validateParams(idParam)), controller.getAdmin);
adminRouter.patch('/destinations/:id', adminWriteLimiter, validate(validateBody(destinationPatch)), controller.update);

// Lifecycle — consequential: each changes what the public internet can see.
adminRouter.post('/destinations/:id/publish', adminWriteLimiter, validate(validateParams(idParam)), controller.publish);
adminRouter.post('/destinations/:id/unpublish', adminWriteLimiter, validate(validateParams(idParam)), controller.unpublish);
adminRouter.post('/destinations/:id/archive', adminWriteLimiter, validate(validateParams(idParam)), controller.archive);
adminRouter.post('/destinations/:id/feature', adminWriteLimiter, validate(validateParams(idParam)), controller.feature);

module.exports = { publicRouter, adminRouter, CONTENT_ROLES };
