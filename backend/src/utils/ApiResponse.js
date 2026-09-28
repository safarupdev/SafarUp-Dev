/**
 * Standard success response envelope.
 *
 * Keeping a single consistent shape ({ success, message, data }) across
 * every endpoint means the `public` and `admin` React apps can share one
 * API client / response-unwrapping helper (PRD §101: shared schemas across
 * web, admin, and backend).
 */

class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

module.exports = ApiResponse;
