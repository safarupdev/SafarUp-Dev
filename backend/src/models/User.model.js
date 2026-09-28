/**
 * User model — PRD §52 (User Document).
 *
 * Fields per §52: _id, email, passwordHash, displayName, photoURL, role,
 * authProvider (local|google), googleId, emailVerified,
 * emailVerificationToken, passwordResetToken, status, createdAt, updatedAt,
 * lastLoginAt.
 *
 * "passwordHash is generated with bcrypt and is never selected/returned by
 * default on any query (select: false at the schema level)." — §52
 *
 * Additional fields beyond the PRD's list, required for a secure auth
 * implementation (not a deviation from the PRD — these support §61/§91
 * security requirements that the PRD states as principles without
 * specifying storage):
 *   - passwordResetExpires: a token without an expiry is not safe to trust.
 *   - emailVerificationExpires: same reasoning for the verification token.
 *   - tokenVersion: incremented on password change / "log out everywhere",
 *     which instantly invalidates every previously issued refresh token
 *     (see utils/tokens.js). Without this, a stolen refresh token would
 *     remain valid until natural expiry even after a password reset.
 */

const { Schema, model } = require('mongoose');
const { ROLES, ALL_ROLES } = require('../constants/roles');

const AUTH_PROVIDERS = Object.freeze(['local', 'google']);
const USER_STATUSES = Object.freeze(['active', 'suspended', 'deleted']);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
      // Not required at the schema level: Google-only accounts have no
      // local password. Enforced conditionally in the auth service instead.
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    photoURL: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ALL_ROLES,
      default: ROLES.CUSTOMER,
      required: true,
    },
    authProvider: {
      type: String,
      enum: AUTH_PROVIDERS,
      default: 'local',
      required: true,
    },
    googleId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'active',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// A customer registering through the public site must never be able to
// self-assign a staff role (PRD §90/§91: admin privileges are never
// trusted from client input). This is enforced in the service layer at
// creation time, not here — the schema only defines what values are
// structurally valid, not who may set them.

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

const User = model('User', userSchema);

module.exports = { User, AUTH_PROVIDERS, USER_STATUSES };
