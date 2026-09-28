/**
 * Generic request validation middleware — PRD §101 (Data Validation),
 * §136 (Customer Form Protection: reject malformed/duplicate input early).
 *
 * Usage: validate(someZodSchema) where the schema expects
 * { body, query, params } shape, mirroring Express's request object.
 */

const ApiError = require('../utils/ApiError');

function validate(schema) {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.slice(1).join('.') || issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', { details, code: 'VALIDATION_ERROR' }));
    }

    // Use the parsed (and coerced/trimmed/lowercased) values downstream.
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) req.query = result.data.query;
    if (result.data.params !== undefined) req.params = result.data.params;

    return next();
  };
}

module.exports = validate;
