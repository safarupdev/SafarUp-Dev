/**
 * Rate limiters — PRD §134 (Rate Limiting): "Protect: login-related
 * endpoints, private-trip requests, contact forms, booking creation,
 * payment order creation, coupon validation, password reset triggers."
 *
 * Only the auth-related limiters are defined here; booking/payment/private
 * trip limiters will be added alongside those routes.
 */

const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

function limiterErrorHandler(_req, _res, next) {
  next(ApiError.tooManyRequests('Too many attempts. Please try again later.'));
}

// Generous enough for real users retyping a password, tight enough to slow
// down credential stuffing / brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

// Tighter than the customer login limiter — the admin portal is a smaller,
// higher-value target (PRD §91: admin security requires strong access
// control), so a stricter throttle is appropriate here.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterErrorHandler,
});

module.exports = { loginLimiter, registerLimiter, passwordResetLimiter, adminLoginLimiter };
