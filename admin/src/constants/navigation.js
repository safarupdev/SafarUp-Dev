/**
 * Admin sidebar navigation — mirrors PRD §36 (Admin Navigation) exactly.
 *
 * Each top-level item may declare `roles` to restrict visibility. Per §60
 * this is a UX convenience only; the backend independently enforces
 * access on every route. Items without `roles` are visible to any staff
 * role (everyone who can log into the admin app at all).
 *
 * Only a Dashboard route is actually implemented in this phase (§149
 * Phase 2 scope: "Admin authentication, roles, dashboard, destination CMS,
 * trip CMS, itinerary builder, departure management"). The remaining §36
 * sections are listed here as the intended structure but link to a
 * "Coming soon" placeholder until their respective domain models/pages are
 * built, so the nav accurately reflects the PRD without presenting dead
 * links as errors.
 */

import { ROLES } from './roles';

export const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    path: '/',
  },
  {
    label: 'Trips',
    children: [
      { label: 'Trip Templates', path: '/trips/templates' },
      { label: 'Departures', path: '/trips/departures' },
      { label: 'Itineraries', path: '/trips/itineraries' },
      { label: 'Availability', path: '/trips/availability' },
    ],
  },
  {
    label: 'Private Trips',
    children: [
      { label: 'Requests', path: '/private-trips/requests' },
      { label: 'Proposals', path: '/private-trips/proposals' },
      { label: 'Active', path: '/private-trips/active' },
    ],
  },
  {
    label: 'Bookings',
    children: [
      { label: 'All', path: '/bookings' },
      { label: 'Pending', path: '/bookings/pending' },
      { label: 'Confirmed', path: '/bookings/confirmed' },
      { label: 'Cancelled', path: '/bookings/cancelled' },
      { label: 'Completed', path: '/bookings/completed' },
    ],
  },
  { label: 'Customers', path: '/customers' },
  { label: 'Destinations', path: '/destinations' },
  { label: 'Hotels', path: '/hotels' },
  { label: 'Transport', path: '/transport' },
  { label: 'Activities', path: '/activities' },
  { label: 'Blog', path: '/blog' },
  {
    label: 'Payments',
    roles: [ROLES.FINANCE, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    children: [
      { label: 'Transactions', path: '/payments/transactions' },
      { label: 'Refunds', path: '/payments/refunds' },
      { label: 'Reconciliation', path: '/payments/reconciliation' },
    ],
  },
  { label: 'Communications', path: '/communications' },
  { label: 'Reports', path: '/reports' },
  {
    label: 'Settings',
    path: '/settings',
    roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  },
  {
    label: 'Audit Logs',
    path: '/audit-logs',
    roles: [ROLES.SUPER_ADMIN],
  },
];
