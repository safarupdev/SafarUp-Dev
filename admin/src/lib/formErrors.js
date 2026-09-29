/**
 * Server error → react-hook-form field-error mapping.
 *
 * The backend's `validate()` middleware converts every Zod issue into
 * `{ field, message }` (API.destination.contract.md §5), and the services add
 * referential-integrity details of the same shape — e.g. a Place pointing at
 * an unknown district answers
 * `details: [{ field: 'districtId', message: 'Unknown district' }]`.
 *
 * Those field paths are the same names the form schemas use, so they can be
 * written straight onto the correct control with `setError`. Anything that
 * cannot be attributed to a field stays a form-level banner instead of being
 * silently dropped.
 */

import { getErrorDetails, getErrorMessage } from './apiClient';

/** HTTP 409 is the contract's conflict status — duplicate slug in practice. */
function isConflict(error) {
  return error?.response?.status === 409;
}

/**
 * Applies `details[]` to the form. Returns the messages that could not be
 * attached to a field, so the caller can still surface them.
 *
 * @param {unknown} error Axios error
 * @param {(name: string, error: { type: string, message: string }) => void} setError
 * @returns {string[]} unassigned messages
 */
export function applyServerFieldErrors(error, setError) {
  const details = getErrorDetails(error);
  const unassigned = [];

  for (const detail of details) {
    if (!detail?.field) {
      if (detail?.message) unassigned.push(detail.message);
      continue;
    }
    setError(detail.field, { type: 'server', message: detail.message });
  }

  return unassigned;
}

/**
 * A slug conflict is a whole-form problem whose only actionable field is the
 * slug itself. The backend's generic 409 text does not name the field, so
 * the field path is added here from the documented contract (§5: "Conflict
 * (e.g. duplicate slug)").
 */
export function applySlugConflict(error, setError) {
  if (!isConflict(error)) return false;
  setError('slug', {
    type: 'server',
    message: 'This slug is already claimed by another record. Slugs are the public URL and must be unique.',
  });
  return true;
}

/** Form-level message for anything not attributable to a field. */
export function formErrorMessage(error, fallback) {
  return getErrorMessage(error, fallback);
}
