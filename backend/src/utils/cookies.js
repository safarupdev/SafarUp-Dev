/**
 * Sets/clears the httpOnly auth cookies — PRD §30 ("Tokens ... stored in
 * httpOnly secure cookies").
 *
 * sameSite: 'lax' is used rather than 'none' because the public/admin apps
 * and backend are first-party (same top-level site, different subdomains
 * per PRD §8), so cross-site cookie sending is not required and 'lax'
 * gives better CSRF protection by default.
 */

const env = require('../config/env');

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // matches default 15m access TTL
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // matches default 30d refresh TTL

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: env.cookies.secure,
    sameSite: 'lax',
    domain: env.cookies.domain,
    maxAge,
    path: '/',
  };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie('accessToken', accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', cookieOptions());
  res.clearCookie('refreshToken', cookieOptions());
}

module.exports = { setAuthCookies, clearAuthCookies };
