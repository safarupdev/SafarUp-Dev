/**
 * Formatters for public content.
 *
 * Every function here is total: an absent, malformed or unexpected value
 * returns `null` rather than throwing. The API serialises dates as ISO 8601
 * strings (API.destination.contract.md §2.2), and a formatter that can throw
 * on a page takes the whole page down with it.
 */

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Parses a value the API claims is an ISO 8601 string.
 * Returns `null` for anything that is not a usable date.
 */
function toDate(value) {
  if (!value) return null;
  // A raw Firestore Timestamp would serialise as { _seconds, _nanoseconds }.
  // The backend normalises these at the data-access boundary, but a
  // destructuring read must never be the thing that crashes a public page.
  if (typeof value === 'object' && typeof value._seconds === 'number') {
    const fromSeconds = new Date(value._seconds * 1000);
    return Number.isNaN(fromSeconds.getTime()) ? null : fromSeconds;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `29 Sep 2026`, or `null` if the value is not a usable date. */
export function formatDate(value) {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : null;
}

/** `29 Sep 2026` or `''` — the render-safe variant. */
export function formatDateOrEmpty(value) {
  return formatDate(value) ?? '';
}

/**
 * Machine-readable form for `<time datetime>` and JSON-LD. `toISOString()`
 * only ever sees a value that already passed `toDate`, so it cannot throw.
 */
export function toIsoString(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

/** Strips a trailing slash so `SITE_URL` composes cleanly into absolute URLs. */
export function joinUrl(...segments) {
  return segments
    .filter(Boolean)
    .map((segment, index) =>
      index === 0 ? String(segment).replace(/\/+$/, '') : String(segment).replace(/^\/+|\/+$/g, '')
    )
    .join('/');
}

/**
 * True only for an absolute http(s) URL.
 *
 * Used to decide whether a stored `seo.canonicalUrl` may be trusted verbatim.
 * A relative or junk value must never reach `<link rel="canonical">`: a
 * malformed canonical is worse than none, because it is a machine-readable
 * assertion about this page's identity (PRD §172).
 */
export function isAbsoluteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Clamps free-text to a search-engine-friendly length without cutting a word. */
export function truncate(value, maxLength) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length <= maxLength) return text || null;
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}
