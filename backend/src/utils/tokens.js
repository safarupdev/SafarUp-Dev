/**
 * JWT access/refresh token helpers.
 *
 * PRD §30: "Tokens are issued as short-lived access tokens + refresh
 * tokens, stored in httpOnly secure cookies." §95 forbids committing
 * secrets; §61 requires JWT-based authentication as a mandatory control.
 *
 * Access and refresh tokens use DIFFERENT secrets on purpose: a leaked
 * access token (short-lived, sent on every request) must never be usable
 * to mint a fresh refresh token, and vice versa.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * @param {{ sub: string, role: string, tokenVersion: number }} payload
 */
function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTokenTtl,
  });
}

/**
 * @param {{ sub: string, tokenVersion: number }} payload
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTokenTtl,
  });
}

/** @returns {{ sub: string, role: string, tokenVersion: number, iat: number, exp: number }} */
function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/** @returns {{ sub: string, tokenVersion: number, iat: number, exp: number }} */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
