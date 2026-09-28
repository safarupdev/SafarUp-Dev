/**
 * Hashes opaque, single-use tokens (email verification, password reset)
 * before persisting them.
 *
 * Rationale: these tokens are emailed in plaintext to the user, so they
 * behave like a password for a short window. If the database were ever
 * read (backup leak, injection, etc.), a plaintext token column would let
 * an attacker immediately verify/reset any account. Storing a SHA-256
 * digest instead means the database alone is not enough to use the token —
 * this is the same reasoning as never storing plaintext passwords (§52),
 * applied to short-lived tokens.
 */

const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generateToken, hashToken };
