/**
 * Helper for writing audit log entries — PRD §59, §77.
 *
 * Centralizing this avoids every controller re-implementing the same
 * "record who did what, to what, with before/after" logic slightly
 * differently. Failures to write an audit log are logged but never thrown —
 * an audit-logging bug must not break the underlying business operation.
 */

const { AuditLog } = require('../models/AuditLog.model');
const logger = require('./logger');

/**
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId | string} params.actorId
 * @param {string} params.actorRole
 * @param {string} params.action e.g. "BOOKING_CANCELLED", "TRIP_PUBLISHED"
 * @param {string} params.entityType e.g. "Booking", "TripTemplate"
 * @param {import('mongoose').Types.ObjectId | string} [params.entityId]
 * @param {object} [params.before]
 * @param {object} [params.after]
 * @param {import('express').Request} [params.req] used to extract IP/user-agent
 */
async function recordAuditLog({ actorId, actorRole, action, entityType, entityId, before, after, req }) {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      before: before ?? null,
      after: after ?? null,
      ipMetadata: req
        ? {
            ip: req.ip,
            userAgent: req.headers['user-agent'] || null,
          }
        : undefined,
    });
  } catch (error) {
    logger.error('Failed to write audit log', {
      action,
      entityType,
      error: error.message,
    });
  }
}

module.exports = { recordAuditLog };
