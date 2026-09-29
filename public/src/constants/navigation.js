/**
 * Global public navigation — PRD §115, PRD §168, DESIGN_SYSTEM.md §5.
 *
 * The bottom navigation is the **primary global navigation on public mobile**
 * and a hamburger is prohibited. Desktop uses an expanded header nav instead.
 * Both render the same destinations: §167 requires desktop and mobile to be
 * independently composed, not one squeezed into the other, but they are still
 * the same product navigation.
 *
 * Every item points at a route that exists in PRD §17. Items whose page is not
 * built yet render an explicit "not available yet" state (see App.jsx) rather
 * than dead links, so no nav item is ever a control that does nothing — they
 * are simply marked `status: 'reserved'` so the component can de-emphasise
 * them (see BottomNav.jsx) instead of presenting an unbuilt surface as if it
 * were live.
 *
 * Icons are the one place the two navs must agree: Explore is the globe
 * (browsing everywhere), Trips is the compass (a specific journey). An icon
 * meaning two different things across breakpoints is a navigation bug.
 */
import { PATHS } from './routes';

/**
 * A route that is reserved in PRD §17 but not built yet. These are honest
 * about their state, but they are NOT allowed to look equally weighted in a
 * primary nav, so they never appear in `DESKTOP_NAV` and carry `status` here.
 */
export const RESERVED_STATUS = 'reserved';

export const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Home',
    shortLabel: 'Home',
    to: PATHS.home,
    icon: 'home',
    match: 'exact',
  },
  {
    key: 'explore',
    label: 'Explore',
    shortLabel: 'Explore',
    to: PATHS.explore,
    icon: 'globe',
    match: 'exact',
  },
  {
    key: 'trips',
    label: 'Trips',
    shortLabel: 'Trips',
    to: PATHS.trips,
    icon: 'compass',
    match: 'prefix',
  },
  {
    key: 'plan',
    label: 'Plan a Trip',
    shortLabel: 'Plan',
    to: PATHS.planTrip,
    icon: 'route',
    match: 'exact',
  },
  {
    // `/login` is the account entry point, and it is reserved (PRD §17): the
    // page is not built, so the tab is honest about that (italic label plus a
    // screen-reader-only note) instead of pretending to be a working account.
    // A "Bookings" tab was dropped from the bottom nav for the same reason —
    // `/dashboard/bookings` is equally unbuilt, and a bottom bar can only carry
    // five. The route is untouched and stays reachable from the footer.
    key: 'account',
    label: 'Account',
    shortLabel: 'Account',
    to: PATHS.login,
    icon: 'user',
    match: 'exact',
    status: RESERVED_STATUS,
    statusLabel: 'not available yet',
  },
];

/**
 * Desktop header navigation.
 *
 * Reconciles to the built routes only. `/login` and `/dashboard/bookings` are
 * reserved: `/login` appears in the header as a ghost CTA rather than as a
 * primary nav item, and `/dashboard/bookings` is a footer link — both are
 * secondary surfaces, so an unbuilt page never sits at the same visual weight
 * as the eight real ones. `/blog` is deliberately absent for the same reason
 * and is reachable from the footer instead.
 *
 * `Destinations` is flagged `forwardFilters` because it is the one header item
 * that can carry the destination list's own query-string filters; see
 * SiteHeader.jsx, which forwards only the filters `destinationsPath()` knows.
 *
 * `match` is the single definition of "is this item the current page", shared
 * with `isCurrentPath()` here and with each component's `NavLink end` prop.
 */
export const DESKTOP_NAV = [
  { key: 'home', label: 'Home', to: PATHS.home, match: 'exact' },
  { key: 'explore', label: 'Explore', to: PATHS.explore, match: 'exact' },
  { key: 'trips', label: 'Trips', to: PATHS.trips, match: 'prefix' },
  { key: 'destinations', label: 'Destinations', to: PATHS.destinations, match: 'prefix', forwardFilters: true },
  { key: 'plan-trip', label: 'Plan a Trip', to: PATHS.planTrip, match: 'exact' },
  { key: 'about', label: 'About', to: PATHS.about, match: 'exact' },
];

/**
 * Is a nav item the current page?
 *
 * Prefix matching is segment-aware, so `/destinations` is NOT marked current
 * while the visitor is on `/destinations/rajgir` — that page is a different
 * page, and a falsely-current nav item misreports where the visitor is.
 *
 * Compares the PATHNAME only. Header items additionally carry a query string
 * in their href (forwarded destination filters); if that leaked in here, a
 * visitor on `/destinations?district=x` would have no current nav item at all.
 */
export function isCurrentPath(item, pathname) {
  if (item.match === 'exact') return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
