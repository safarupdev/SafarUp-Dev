/**
 * Route paths — PRD §17 (Public Website Information Architecture).
 *
 * Paths are written out here and nowhere else, so a link can never be built
 * from a string literal that has drifted from the route table. They are
 * readable and semantic: `/destinations/rajgir`, never a raw Firestore
 * document ID (PRD §131, DESTINATION.domain.contract.md §2).
 */

import { joinUrl } from '../lib/format';

export const PATHS = {
  home: '/',
  destinations: '/destinations',
  places: '/places',
  trips: '/trips',
  blog: '/blog',
  planTrip: '/plan-trip',
  about: '/about',
  explore: '/explore',
  login: '/login',
  dashboardBookings: '/dashboard/bookings',
};

export const destinationPath = (slug) => joinUrl(PATHS.destinations, slug);
export const tripPath = (slug) => joinUrl(PATHS.trips, slug);

/**
 * RESERVED, `noindex`. `/places/:slug` is NOT part of PRD §17 — whether a
 * Place has its own public page and what its indexability is, is an
 * unresolved decision (PRD §200.6, §200.9). The route renders an explicit
 * "not available yet" state and must not be indexed until §200.6 settles.
 *
 * `placePath` is exported for that route but is deliberately UNUSED by the
 * pages. A Place is a stop inside a journey, not a standalone product, so
 * "Places to visit" chips are non-linking and the `includesAttraction`
 * structured data carries names with no `url`. Linking here would assert an
 * indexable Place identity that contradicts both the `noindex` route and the
 * name-only structured data. Delete this helper with the route if §200.6
 * decides a Place gets no public page.
 */
export const placePath = (slug) => joinUrl(PATHS.places, slug);

/**
 * Filtered destination lists. Filters live in the query string so a filtered
 * view is shareable, bookmarkable and crawlable (PRD §172) rather than living
 * only in component state.
 */
export const destinationsPath = ({ district, category } = {}) => {
  const params = new URLSearchParams();
  if (district) params.set('district', district);
  if (category) params.set('category', category);
  const query = params.toString();
  return query ? `${PATHS.destinations}?${query}` : PATHS.destinations;
};
