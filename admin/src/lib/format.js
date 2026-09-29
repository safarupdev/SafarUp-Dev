/** Small display helpers shared by the content screens. */

/**
 * ISO 8601 → readable local timestamp. The backend normalises Firestore
 * Timestamps at the data-access boundary, so values arrive as strings
 * (FIRESTORE.destination.contract.md §6).
 */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Comma-separated names from a resolved relation array, or a dash. */
export function relationNames(items) {
  if (!Array.isArray(items) || items.length === 0) return '—';
  return items.map((item) => item?.name).filter(Boolean).join(', ');
}
