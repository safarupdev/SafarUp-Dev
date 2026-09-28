/**
 * Role model — PRD §6 (Internal Users) and §60 (Authorization Model).
 *
 * CUSTOMER is the public-facing traveler role (not documented as a formal
 * "internal user" in §6, but every booking/private-trip request is owned by
 * a user with this role — see §52 User Document, §55 Booking, §56 Private
 * Trip Request).
 *
 * The remaining six roles are the internal/staff roles from §6.1–6.5 plus
 * SUPER_ADMIN. Per §60: "Each role receives explicit permissions. Do not
 * implement authorization only through hidden UI buttons. Authorization
 * must also be enforced server-side." We deliberately do NOT encode a
 * numeric rank/hierarchy here (the §60 diagram is an org chart, not a
 * strict permission ladder — OPERATIONS, CONTENT, FINANCE and SUPPORT are
 * peer functional roles per §6.2–6.5, not tiers of one another). Every
 * protected route explicitly allow-lists which roles may access it.
 */

const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  SUPPORT: 'SUPPORT',
  FINANCE: 'FINANCE',
  CONTENT: 'CONTENT',
  OPERATIONS: 'OPERATIONS',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

/** All roles that represent internal/staff users (i.e. everything but CUSTOMER). */
const STAFF_ROLES = Object.freeze([
  ROLES.SUPPORT,
  ROLES.FINANCE,
  ROLES.CONTENT,
  ROLES.OPERATIONS,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]);

/** Roles allowed to sign in to the admin application at all (everything but CUSTOMER). */
const ADMIN_APP_ROLES = STAFF_ROLES;

/** Only Super Admin may manage other administrators and system-wide settings (§6.1, §139). */
const SUPER_ADMIN_ONLY = Object.freeze([ROLES.SUPER_ADMIN]);

const ALL_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  STAFF_ROLES,
  ADMIN_APP_ROLES,
  SUPER_ADMIN_ONLY,
  ALL_ROLES,
};
