/**
 * Audit log model — PRD §59 (Audit Log) and §77 (Admin Auditability),
 * backed by Firestore.
 *
 * Fields per §59: id, actorId (ref users), actorRole, action, entityType,
 * entityId, before, after, timestamp, ipMetadata.
 *
 * "Avoid storing unnecessary sensitive information." — §59. `before`/
 * `after` are stored as plain maps so any entity type can be audited
 * generically, but callers are responsible for stripping secrets
 * (password hashes, payment credentials, etc.) before passing them in —
 * see utils/auditLog.js.
 *
 * Audit logs are append-only: this module intentionally exposes no
 * update/delete functions (§59, §77 — auditability requires the log
 * itself to be tamper-resistant). Firestore auto-generates the document
 * ID via `.add()`.
 */

const { getFirestore } = require('../config/database');

const COLLECTION = 'auditLogs';

/**
 * @param {object} entry
 * @param {string | null} entry.actorId
 * @param {string} entry.actorRole
 * @param {string} entry.action
 * @param {string} entry.entityType
 * @param {string | null} [entry.entityId]
 * @param {object | null} [entry.before]
 * @param {object | null} [entry.after]
 * @param {{ ip: string | null, userAgent: string | null }} [entry.ipMetadata]
 */
async function create(entry) {
  const db = getFirestore();
  const document = {
    actorId: entry.actorId ?? null,
    actorRole: entry.actorRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    timestamp: new Date(),
    ipMetadata: entry.ipMetadata ?? null,
  };
  const ref = await db.collection(COLLECTION).add(document);
  return { _id: ref.id, id: ref.id, ...document };
}

module.exports = { COLLECTION, create };
