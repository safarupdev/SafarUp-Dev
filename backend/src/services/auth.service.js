/**
 * Auth business logic — PRD §30 (Authentication).
 *
 * Kept separate from the controller (thin HTTP layer) so the same logic
 * could be reused by, e.g., an admin-invite flow or a seed script without
 * going through Express.
 */

const bcrypt = require('bcryptjs');
const { User } = require('../models/User.model');
const { ROLES } = require('../constants/roles');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { generateToken, hashToken } = require('../utils/hashToken');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const emailService = require('./email.service');

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Registers a new CUSTOMER account. Staff/admin accounts are never created
 * through this path — see PRD §90/§91; admin accounts must be provisioned
 * by a Super Admin (or the bootstrap seed script), never via public signup.
 */
async function register({ fullName, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    // Deliberately vague to avoid confirming which emails are registered
    // (basic enumeration hardening) while still being actionable for the
    // legitimate owner of the address.
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  const verificationToken = generateToken();

  const user = await User.create({
    email,
    passwordHash,
    displayName: fullName,
    role: ROLES.CUSTOMER,
    authProvider: 'local',
    emailVerified: false,
    emailVerificationToken: hashToken(verificationToken),
    emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

  await emailService.sendVerificationEmail({
    to: user.email,
    displayName: user.displayName,
    verificationToken,
  });

  return user;
}

async function verifyEmail(rawToken) {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw ApiError.badRequest('Verification link is invalid or has expired');
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();

  await emailService.sendWelcomeEmail({ to: user.email, displayName: user.displayName });

  return user;
}

async function resendVerificationEmail(email) {
  const user = await User.findOne({ email });
  // Always respond as if it succeeded (enumeration hardening) — the
  // controller returns a generic message regardless of `user` existing.
  if (!user || user.emailVerified) {
    return;
  }

  const verificationToken = generateToken();
  user.emailVerificationToken = hashToken(verificationToken);
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  await emailService.sendVerificationEmail({
    to: user.email,
    displayName: user.displayName,
    verificationToken,
  });
}

/**
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string[]} [params.allowedRoles] If provided, login is rejected
 *   for any user whose role is not in this list. Used by the admin app's
 *   login endpoint (PRD §133: "Admin route protection must happen at:
 *   1. Authentication 2. Authorization 3. Backend operation level") so a
 *   CUSTOMER credential can never establish an admin session, and a staff
 *   credential can never accidentally be treated as a customer session.
 * @returns {{ user: import('../models/User.model').User, accessToken: string, refreshToken: string }}
 */
async function login({ email, password, allowedRoles }) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  if (!user || !user.passwordHash) {
    // Same message whether the email doesn't exist or the password is
    // wrong — never reveal which one it was.
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('This account has been suspended. Contact support for help.');
  }

  if (!user.emailVerified) {
    throw ApiError.forbidden('Please verify your email before logging in', {
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Deliberately the same generic message as "wrong password" — an
    // attacker probing the admin login endpoint with a known customer
    // email/password must not be able to distinguish "wrong credentials"
    // from "correct credentials, wrong portal".
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = issueTokenPair(user);
  return { user, ...tokens };
}

function issueTokenPair(user) {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion: user.tokenVersion,
  });
  return { accessToken, refreshToken };
}

/**
 * Exchanges a valid refresh token for a new access/refresh token pair.
 * Rejects if the user's tokenVersion has since changed (password reset,
 * explicit logout-everywhere, or account suspension).
 */
async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.status !== 'active' || payload.tokenVersion !== user.tokenVersion) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  return { user, ...issueTokenPair(user) };
}

/**
 * @param {string} email
 * @param {'public' | 'admin'} [audience] Determines which app's URL the
 *   reset link points to (see email.service.js sendPasswordResetEmail).
 */
async function forgotPassword(email, audience = 'public') {
  const user = await User.findOne({ email });
  if (!user || user.authProvider !== 'local') {
    // Do not reveal whether the account exists or is Google-only.
    return;
  }

  const resetToken = generateToken();
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  await emailService.sendPasswordResetEmail({
    to: user.email,
    displayName: user.displayName,
    resetToken,
    audience,
  });
}

async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +tokenVersion');

  if (!user) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  user.passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  // Invalidate every previously issued refresh token — a password reset
  // must log the user out everywhere else too.
  user.tokenVersion += 1;
  await user.save();

  return user;
}

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  refreshSession,
  forgotPassword,
  resetPassword,
  issueTokenPair,
};
