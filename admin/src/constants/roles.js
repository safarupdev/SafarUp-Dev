/**
 * Mirrors backend/src/constants/roles.js — PRD §6 (Internal Users) and
 * §60 (Authorization Model).
 *
 * This is a UI-side mirror for display/routing decisions only (e.g. which
 * nav items to show, which routes to guard). It must never be the actual
 * enforcement mechanism — the backend independently re-checks the role on
 * every request (PRD §60: "Do not implement authorization only through
 * hidden UI buttons. Authorization must also be enforced server-side.").
 */

export const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  SUPPORT: 'SUPPORT',
  FINANCE: 'FINANCE',
  CONTENT: 'CONTENT',
  OPERATIONS: 'OPERATIONS',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

/** Roles allowed to use the admin application at all. */
export const ADMIN_APP_ROLES = Object.freeze([
  ROLES.SUPPORT,
  ROLES.FINANCE,
  ROLES.CONTENT,
  ROLES.OPERATIONS,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]);

export function roleLabel(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return 'Super Admin';
    case ROLES.ADMIN:
      return 'Admin';
    case ROLES.OPERATIONS:
      return 'Operations';
    case ROLES.CONTENT:
      return 'Content';
    case ROLES.FINANCE:
      return 'Finance';
    case ROLES.SUPPORT:
      return 'Support';
    default:
      return role;
  }
}
