/**
 * List queries for the content CMS.
 *
 * Two hooks because the API paginates two of the four entities and not the
 * other two — that difference is in the backend repositories, not a UI
 * preference, and the UI must not pretend otherwise:
 *
 *   destinations, districts → cursor paginated, `{ items, nextCursor }`
 *                              (API.destination.contract.md §2.1a)
 *   categories, places     → a single bounded page, `{ items }` only
 *
 * Neither hook ever sends `q`. Phase 2 rejects it with 400
 * (API.destination.contract.md §2.1b), so there is no search box in this CMS.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ADMIN_DETAIL_BY_ENTITY,
  ADMIN_LIST_BY_ENTITY,
  listAdminCategories,
  listAdminDistricts,
} from '../api/content.api';

/** Page size for the cursor-paginated lists (backend default is also 20). */
export const PAGE_SIZE = 20;

/**
 * Backend `clampLimit` default is 20 and hard maximum is 100. The two
 * non-paginated lists ask for the maximum so an editor sees the whole set
 * rather than an arbitrary first page with no way to reach the rest.
 */
export const MAX_NON_PAGINATED = 100;

/** Cursor-paginated list, for Destination and District. */
export function useCursorContentList({ entity, params, enabled = true }) {
  return useInfiniteQuery({
    queryKey: ['admin', entity, 'list', params],
    queryFn: ({ pageParam }) => ADMIN_LIST_BY_ENTITY[entity]({ ...params, cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

/** Single bounded page, for Category and Place. */
export function useFlatContentList({ entity, params, enabled = true }) {
  return useQuery({
    queryKey: ['admin', entity, 'list', params],
    queryFn: () => ADMIN_LIST_BY_ENTITY[entity]({ ...params, limit: MAX_NON_PAGINATED }),
    enabled,
  });
}

/** Flattens a cursor list's pages into one array. */
export function flattenPages(query) {
  return (query.data?.pages ?? []).flatMap((page) => page.items);
}

/** Admin detail read. `id` of `null` disables the query (create mode). */
export function useContentDetail({ entity, id, enabled = true }) {
  return useQuery({
    queryKey: ['admin', entity, 'detail', id],
    queryFn: () => ADMIN_DETAIL_BY_ENTITY[entity](id),
    enabled: enabled && Boolean(id),
  });
}

/**
 * Every district, for relation labels and for the District pickers in the
 * Place and Destination editors. Includes DRAFT and ARCHIVED: a draft
 * destination must still be able to point at the district it belongs to.
 */
export function useDistrictOptions() {
  return useQuery({
    queryKey: ['admin', 'districts', 'list', {}],
    queryFn: () => listAdminDistricts({ limit: MAX_NON_PAGINATED }),
  });
}

/** Every category, same rationale as {@link useDistrictOptions}. */
export function useCategoryOptions() {
  return useQuery({
    queryKey: ['admin', 'categories', 'list', {}],
    queryFn: () => listAdminCategories({ limit: MAX_NON_PAGINATED }),
  });
}

/** Every place, for the Destination editor's N:M place picker. */
export function usePlaceOptions() {
  return useQuery({
    queryKey: ['admin', 'places', 'list', {}],
    queryFn: () => ADMIN_LIST_BY_ENTITY.places({ limit: MAX_NON_PAGINATED }),
  });
}
