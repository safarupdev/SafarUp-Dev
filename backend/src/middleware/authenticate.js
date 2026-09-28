/**
 * Authentication middleware — PRD §61 (mandatory JWT-based authentication)
 * and §133 (Admin URL Security: "Admin route protection must happen at:
 * 1. Authentication 2. Authorization 3. Backend operation level. Hiding
 * /admin from navigation is not security.").
 *
 * Reads the access token from the httpOnly cookie (preferred, per §30) and
 * falls back to an Authorization: Bearer header (useful for non-browser
 * clients / testing). On success, attaches the authenticated user document
 * to req.user. Never trusts a role or user id passed in the request body.
 */

const { verifyAccessToken } = require('../utils/tokens');
const { User } = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function extractToken(req) {
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return null;
}

const authenticate = asyncHandler(async function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Authentication required');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session. Please log in again.');
  }

  // +tokenVersion is required because it is `select: false` by default.
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }
  if (user.status !== 'active') {
    throw ApiError.forbidden('This account is not active');
  }
  // If the token was issued before a password reset / "log out everywhere"
  // event, tokenVersion will not match and the token must be rejected even
  // though it has not naturally expired yet.
  if (payload.tokenVersion !== user.tokenVersion) {
    throw ApiError.unauthorized('Session has been invalidated. Please log in again.');
  }

  req.user = user;
  next();
});

/**
 * Like `authenticate`, but does not fail the request if no/invalid token is
 * present — used for endpoints that are public but behave differently for
 * a logged-in user (rare in V1; kept for completeness/future use).
 */
const authenticateOptional = asyncHandler(async function authenticateOptional(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (user && user.status === 'active' && payload.tokenVersion === user.tokenVersion) {
      req.user = user;
    }
  } catch {
    // Silently ignore — this endpoint does not require authentication.
  }
  return next();
});

module.exports = { authenticate, authenticateOptional };
