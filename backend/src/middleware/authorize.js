/**
 * Authorization (role-based access control) middleware.
 *
 * PRD §60 (Authorization Model): "Each role receives explicit permissions.
 * Do not implement authorization only through hidden UI buttons.
 * Authorization must also be enforced server-side."
 *
 * PRD §100 (Admin Testing) explicitly requires verifying that, e.g., a
 * content admin cannot modify financial records and a finance user cannot
 * change trip content unless permitted — this middleware is the mechanism
 * that makes those tests meaningful: every admin route declares its own
 * allow-list of roles.
 *
 * Must run AFTER `authenticate` (depends on req.user being set).
 */

const ApiError = require('../utils/ApiError');

/**
 * @param {...string} allowedRoles Roles permitted to access the route.
 */
function authorize(...allowedRoles) {
  return function authorizeMiddleware(req, _res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action', {
          code: 'FORBIDDEN_ROLE',
        })
      );
    }
    return next();
  };
}

module.exports = authorize;
