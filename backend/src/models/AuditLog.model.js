/**
 * Audit log model — PRD §59 (Audit Log) and §77 (Admin Auditability).
 *
 * Fields per §59: _id, actorId (ref users), actorRole, action, entityType,
 * entityId, before, after, timestamp, ipMetadata.
 *
 * "Avoid storing unnecessary sensitive information." — §59. We store
 * before/after as plain objects (Mixed) so any entity type can be audited
 * generically, but callers are responsible for stripping secrets
 * (password hashes, payment credentials, etc.) before passing them in —
 * see utils/auditLog.js.
 */

const { Schema, model } = require('mongoose');

const auditLogSchema = new Schema(
  {
    // Not required: some events (e.g. a failed admin login attempt) have
    // no known actor. `actorRole` covers those cases with sentinel values
    // like "UNKNOWN" (see utils/auditLog.js), so it is intentionally a
    // free-form string rather than restricted to the real user-role enum.
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    before: {
      type: Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    ipMetadata: {
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
    },
  },
  {
    timestamps: false, // this model has its own `timestamp` field per §59
  }
);

// Audit logs are append-only: no update/delete helpers are exposed
// anywhere in the codebase on purpose (§59, §77 — auditability requires
// the log itself to be tamper-resistant).

const AuditLog = model('AuditLog', auditLogSchema);

module.exports = { AuditLog };
