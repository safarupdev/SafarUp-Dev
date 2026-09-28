/**
 * Central error handler — PRD §72 (Error Handling): "Never expose raw
 * Firebase/Razorpay/server errors to customers" (now: never expose raw
 * Mongoose/Razorpay/internal errors — see PRD v1.1 changelog).
 *
 * Every route is wrapped in asyncHandler, so any thrown error ends up
 * here. Known/expected errors (ApiError) are passed through as-is with
 * their intended status code and message. Anything else (a real bug, a
 * driver-level Mongo error, etc.) is logged with full detail server-side
 * but returned to the client as a generic 500 message — the raw message
 * or stack trace never reaches the response body in production.
 */

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let apiError = err;

  if (!(err instanceof ApiError)) {
    // Translate well-known Mongoose/Mongo error shapes into safe ApiErrors
    // instead of leaking driver internals to the client.
    if (err?.code === 11000) {
      apiError = ApiError.conflict('A record with these details already exists');
    } else if (err?.name === 'ValidationError') {
      apiError = ApiError.badRequest('Validation failed', {
        details: Object.values(err.errors || {}).map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    } else if (err?.name === 'CastError') {
      apiError = ApiError.badRequest('Invalid identifier supplied');
    } else {
      apiError = ApiError.internal();
    }
  }

  const isUnexpected = !err.isOperational;
  if (isUnexpected || apiError.statusCode >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: env.isProduction ? undefined : err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(apiError.code ? { code: apiError.code } : {}),
    ...(apiError.details ? { details: apiError.details } : {}),
  });
}

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };
