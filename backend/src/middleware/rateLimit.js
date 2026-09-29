/**
 * Rate limiters — PRD §134 (Rate Limiting): "Protect: login-related
 * endpoints, private-trip requests, contact forms, booking creation,
 * payment order creation, coupon validation, password reset triggers."
 *
 * Only the auth-related limiters are defined here; booking/payment/private
 * trip limiters will be added alongside those routes.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function limiterErrorHandler(_req, _res, next) {
  next(ApiError.tooManyRequests('Too many attempts. Please try again later.'));
}

/**
 * The limiters below use express-rate-limit's default in-memory store, which
 * is per-process and keyed by IP. That is acceptable for a single-instance
 * deployment but ineffective behind a load balancer, where each instance
 * keeps its own counters (see PRD §134 / Phase 0.5 — a shared store is the
 * fix when this is deployed to more than one instance).
 *
 * It is also disabled entirely under NODE_ENV=test: every request in a
 * test suite originates from 127.0.0.1, so a handful of auth tests would
 * exhaust the login quota and fail with spurious 429s. Rate limiting is
 * not what these tests assert; disabling it keeps the suite deterministic.
 */
function defineLimiter(options) {
  return rateLimit({ ...options, skip: () => env.isTest });
}

// Generous enough for real users retyping a password, tight enough to slow
// down credential stuffing / brute force.
const loginLimiter = defineLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

const registerLimiter = defineLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

const passwordResetLimiter = defineLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

// Tighter than the customer login limiter — the admin portal is a smaller,
// higher-value target (PRD §91: admin security requires strong access
// control), so a stricter throttle is appropriate here.
const adminLoginLimiter = defineLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

// PRD §134: "Protect: ... private-trip requests, contact forms, booking
// creation, payment order creation, coupon validation".
//
// Phase 2 adds public discovery reads. These are generous because the
// destination list/detail is how search engines and AI agents discover
// SafarUp (PRD §172, §197) — throttling it too hard damages discoverability.
const publicReadLimiter = defineLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

// Admin content writes. Tighter: a smaller, authenticated, higher-value
// surface, and content mutation is not a high-frequency operation.
const adminWriteLimiter = defineLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  adminLoginLimiter,
  publicReadLimiter,
  adminWriteLimiter,
};
