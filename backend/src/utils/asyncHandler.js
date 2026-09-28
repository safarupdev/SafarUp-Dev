/**
 * Wraps an async Express route/middleware handler so any thrown error
 * (or rejected promise) is forwarded to `next()` instead of crashing the
 * process or hanging the request. Every controller in this codebase is
 * wrapped with this, so `try/catch` boilerplate never has to be repeated
 * per-route — errors always flow to the central error handler
 * (see middleware/errorHandler.js), which is required for PRD §72
 * (consistent, safe error responses).
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<any>} fn
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
