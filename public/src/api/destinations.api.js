/**
 * Destination reads — API.destination.contract.md §2.
 *
 * Two endpoints exist in Phase 2:
 *   GET /destinations         list, cursor-paginated
 *   GET /destinations/:slug   detail by canonical slug
 *
 * `GET /destinations/:slug/trips` is Phase 3 (the `tripTemplates` entity is
 * not contracted) and `q` search answers 400 `SEARCH_NOT_AVAILABLE` (§2.1b).
 * Neither is called from here, deliberately — a client that asked for search
 * would receive an error it cannot honestly present as results.
 *
 * List items carry the *same* resolved `district` / `categories` / `places`
 * shapes as the detail payload (§2.2), so a card renders with one request and
 * no N+1.
 */

import { apiClient, unwrap } from '../lib/apiClient';

/** Default page size; the API clamps to 20/100 (§2.1). */
export const DEFAULT_PAGE_SIZE = 12;

/**
 * @param {object} params
 * @param {string} [params.district] district slug (§200.3 canonical district)
 * @param {string[]} [params.categories] category slugs; "match any", merged
 *   and de-duplicated server-side (§2.1). One value per request is the
 *   contract's simplest form — the endpoint accepts repeats, but a
 *   single-select public filter never needs them.
 * @param {boolean} [params.featured] homepage rail (§18)
 * @param {string} [params.cursor] opaque cursor from the previous page
 * @param {number} [params.limit]
 */
export async function fetchDestinations({
  district,
  categories,
  featured,
  cursor,
  limit = DEFAULT_PAGE_SIZE,
} = {}) {
  const response = await apiClient.get('/destinations', {
    params: {
      ...(district ? { district } : {}),
      ...(categories && categories.length > 0 ? { category: categories } : {}),
      ...(featured === true ? { featured: true } : {}),
      ...(cursor ? { cursor } : {}),
      limit,
    },
  });

  const data = unwrap(response);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    // Absent on the final page (§2.1a). Normalised to `null` so "no more
    // pages" is never a truthy-but-empty string.
    nextCursor: data?.nextCursor ?? null,
  };
}

/** Detail by slug. Rejects with 404 for unknown AND non-published slugs. */
export async function fetchDestinationBySlug(slug) {
  const response = await apiClient.get(`/destinations/${encodeURIComponent(slug)}`);
  return unwrap(response)?.destination ?? null;
}
