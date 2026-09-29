/**
 * Role awareness notice — PRD §60, §63, and DESTINATION.domain.contract.md §8.
 *
 * Content management requires the CONTENT role or above. This states that
 * plainly so an editor understands why a screen is empty or a 403 appears —
 * but it is explicitly a **UX affordance, not the boundary**. The backend
 * `authorize()` middleware re-checks the role on every request; hiding a
 * button is never authorization (PRD §60: "Do not implement authorization
 * only through hidden UI buttons").
 */

import { ROLES, roleLabel } from '../../constants/roles';

export const CONTENT_ROLES = Object.freeze([ROLES.CONTENT, ROLES.OPERATIONS, ROLES.ADMIN, ROLES.SUPER_ADMIN]);

export default function ContentRoleNotice() {
  const allowed = CONTENT_ROLES.map(roleLabel).join(', ');

  return (
    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      Managing content requires one of: {allowed}. The server enforces this on every request
      (<code className="text-slate-700">authorize()</code>); this screen only reflects it.
    </p>
  );
}
