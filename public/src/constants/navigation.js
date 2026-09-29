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
 * than dead links, so no bottom-nav item is ever a control that does nothing.
 */
import { PATHS } from './routes';

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
    key: 'trips',
    label: 'Trips',
    shortLabel: 'Trips',
    to: PATHS.trips,
    icon: 'compass',
    match: 'prefix',
  },
  {
    key: 'explore',
    label: 'Explore',
    shortLabel: 'Explore',
    to: PATHS.destinations,
    icon: 'map',
    match: 'prefix',
  },
  {
    key: 'bookings',
    label: 'Bookings',
    shortLabel: 'Bookings',
    to: PATHS.dashboardBookings,
    icon: 'ticket',
    match: 'prefix',
  },
  {
    key: 'account',
    label: 'Account',
    shortLabel: 'Account',
    to: PATHS.login,
    icon: 'user',
    match: 'prefix',
  },
];

/**
 * Desktop header navigation. Explore is broken out into its sub-items
 * because desktop has room for a real menu (DESIGN_SYSTEM.md §4, "expanded
 * navigation"), and Explore is the one bottom-nav item that "can contain"
 * more (PRD §115).
 */
export const DESKTOP_NAV = [
  { key: 'home', label: 'Home', to: PATHS.home },
  { key: 'trips', label: 'Trips', to: PATHS.trips },
  { key: 'destinations', label: 'Destinations', to: PATHS.destinations },
  { key: 'plan-trip', label: 'Plan a Private Trip', to: PATHS.planTrip },
  { key: 'blog', label: 'Travel Stories', to: PATHS.blog },
];

/**
 * Is a nav item the current page?
 *
 * Prefix matching is segment-aware, so `/destinations` is NOT marked current
 * while the visitor is on `/destinations/rajgir` — that page is a different
 * page, and a falsely-current nav item misreports where the visitor is.
 */
export function isCurrentPath(item, pathname) {
  if (item.match === 'exact') return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
