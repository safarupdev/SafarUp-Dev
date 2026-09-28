/**
 * Standard application error.
 *
 * PRD §72 (Error Handling): "Never expose raw ... server errors to
 * customers." Every controller/middleware throws an ApiError for expected
 * failure cases (bad input, not found, unauthorized, conflict, etc.). The
 * central error handler (see middleware/errorHandler.js) knows how to turn
 * these into a safe, consistent JSON response. Anything that is NOT an
 * ApiError is treated as an unexpected/internal error and is never leaked
 * to the client in production.
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code.
   * @param {string} message Human-readable, customer-safe message.
   * @param {object} [options]
   * @param {Array<{ field: string, message: string }>} [options.details] Field-level validation errors.
   * @param {string} [options.code] Machine-readable error code for frontend branching.
   */
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = options.details || undefined;
    this.code = options.code || undefined;
    this.isOperational = true; // distinguishes "expected" errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', options) {
    return new ApiError(400, message, options);
  }

  static unauthorized(message = 'Authentication required', options) {
    return new ApiError(401, message, options);
  }

  static forbidden(message = 'You do not have permission to perform this action', options) {
    return new ApiError(403, message, options);
  }

  static notFound(message = 'Resource not found', options) {
    return new ApiError(404, message, options);
  }

  static conflict(message = 'Resource already exists', options) {
    return new ApiError(409, message, options);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', options) {
    return new ApiError(429, message, options);
  }

  static internal(message = 'Something went wrong. Please try again.', options) {
    return new ApiError(500, message, options);
  }
}

module.exports = ApiError;
