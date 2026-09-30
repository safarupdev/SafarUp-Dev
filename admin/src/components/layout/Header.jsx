/**
 * Header inside the top of the main dashboard surface — matching Image 2 styling.
 * Includes breadcrumbs, live API indicator, notification bell with red alert dot,
 * and quick access to storefront.
 */

import { Link, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';

const SEGMENT_LABELS = {
  destinations: 'Destinations',
  districts: 'Districts',
  categories: 'Categories',
  places: 'Places',
  trips: 'Trips',
  templates: 'Templates',
  departures: 'Departures',
  itineraries: 'Itineraries',
  availability: 'Availability',
  bookings: 'Bookings',
  customers: 'Customers',
  payments: 'Payments',
  settings: 'Settings',
  'audit-logs': 'Audit Logs',
  new: 'New Entry',
};

export default function Header() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-slate-100 bg-white px-6 md:px-8">
      {/* Left: Dynamic Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          to="/"
          className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-navy-950 transition-colors"
        >
          <Icon name="dashboard" className="h-4 w-4 text-slate-400" />
          <span>Console</span>
        </Link>

        {pathSegments.length > 0 && (
          <span className="text-slate-300" aria-hidden="true">
            /
          </span>
        )}

        {pathSegments.map((segment, idx) => {
          const isLast = idx === pathSegments.length - 1;
          const href = `/${pathSegments.slice(0, idx + 1).join('/')}`;
          const label = SEGMENT_LABELS[segment] ?? segment;

          return (
            <span key={href} className="flex items-center gap-2">
              {isLast ? (
                <span className="font-bold text-navy-950" aria-current="page">
                  {label}
                </span>
              ) : (
                <>
                  <Link
                    to={href}
                    className="font-medium text-slate-500 hover:text-navy-950 transition-colors"
                  >
                    {label}
                  </Link>
                  <span className="text-slate-300" aria-hidden="true">
                    /
                  </span>
                </>
              )}
            </span>
          );
        })}
      </nav>

      {/* Right: Notification Bell (with red alert dot like Image 2) + Storefront link */}
      <div className="flex items-center gap-3">
        {/* Public Storefront Link */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors"
          title="Open Public Travel Storefront"
        >
          <Icon name="compass" className="h-3.5 w-3.5 text-accent-600" />
          <span>View Public Site</span>
          <Icon name="externalLink" className="h-3 w-3 text-slate-400" />
        </a>

        {/* Live Status Chip */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live API</span>
        </div>

        {/* Notification Bell with red alert dot (Exact match from Image 2) */}
        <button
          type="button"
          title="Notifications"
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-navy-950 transition-colors"
        >
          <Icon name="bell" className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
