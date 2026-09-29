/**
 * Public taxonomy reads — District, Category and Place
 * (DISTRICT / CATEGORY / PLACE domain contracts).
 *
 * These power the destination list's filter controls. They are read from the
 * live API rather than hardcoded, because a hardcoded filter list is a second
 * source of truth for the taxonomy and would drift the moment a Content Admin
 * publishes a district (PRD §173, §157).
 *
 * The public projections are minimal by design: `{ id, slug, name }` plus
 * `sortOrder` for Category, which exists only to order categories inside
 * Explore (PRD §115, CATEGORY.domain.contract.md §2).
 */

import { apiClient, unwrap } from '../lib/apiClient';

async function fetchItems(path) {
  const response = await apiClient.get(path);
  const data = unwrap(response);
  return Array.isArray(data?.items) ? data.items : [];
}

/** Published districts. Cursor-paginated server-side; this is the first page. */
export async function fetchDistricts() {
  return fetchItems('/districts');
}

/** Published categories, ordered for Explore by `sortOrder` then name. */
export async function fetchCategories() {
  const items = await fetchItems('/categories');
  return [...items].sort((a, b) => {
    const left = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const right = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (left !== right) return left - right;
    return String(a.name).localeCompare(String(b.name));
  });
}
