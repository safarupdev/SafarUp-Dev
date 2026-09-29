import { Link } from 'react-router-dom';
import { Wordmark } from './SiteHeader';
import { PATHS } from '../../constants/routes';
import { SITE_NAME, SITE_TAGLINE } from '../../constants/site';

const FOOTER_GROUPS = [
  {
    id: 'explore',
    heading: 'Explore',
    links: [
      { label: 'Destinations', to: PATHS.destinations },
      { label: 'Trips', to: PATHS.trips },
      { label: 'Travel Stories', to: PATHS.blog },
    ],
  },
  {
    id: 'plan',
    heading: 'Plan',
    links: [
      { label: 'Plan a Private Trip', to: PATHS.planTrip },
      { label: 'Your bookings', to: PATHS.dashboardBookings },
      { label: 'Sign in', to: PATHS.login },
    ],
  },
];

/**
 * Site footer.
 *
 * Carries the internal links that make the public graph crawlable
 * (PRD §172), including the reserved routes that the primary navigation
 * deliberately leaves out — `/blog`, `/dashboard/bookings` and `/login` are
 * all reachable from here, so nothing is unreachable and nothing unbuilt is
 * given primary-nav weight.
 *
 * The group labels are `<p>`, not headings. Three `<h2>`s per page put footer
 * furniture into the document outline of every route, and a screen-reader user
 * paging by heading would meet "Explore", "Plan" and "Start planning" as if
 * they were sections of the page. The `nav` landmarks name themselves with
 * `aria-labelledby` instead, so each is still individually addressable
 * alongside the header nav and the bottom bar.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-navy-100 bg-navy-950 text-navy-200">
      <div className="mx-auto max-w-shell px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Wordmark tone="dark" />
            <p className="max-w-xs text-sm leading-relaxed text-navy-300">
              {SITE_NAME} — {SITE_TAGLINE} Curated group trips and fully customised private journeys
              across India.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.id} aria-labelledby={`footer-group-${group.id}`}>
              <p
                id={`footer-group-${group.id}`}
                className="text-xs font-bold uppercase tracking-wider text-navy-400"
              >
                {group.heading}
              </p>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-block rounded py-0.5 text-sm text-navy-200 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Start planning</p>
            <p className="text-sm leading-relaxed text-navy-300">
              Tell us where and when. Our team builds the rest.
            </p>
            <Link
              to={PATHS.planTrip}
              className="inline-flex min-h-11 items-center rounded-full bg-accent-600 px-5 text-sm font-semibold text-white transition-colors duration-150 ease-standard hover:bg-accent-700"
            >
              Plan a Private Trip
            </Link>
          </div>
        </div>

        <p className="mt-10 border-t border-navy-800 pt-6 text-xs text-navy-400">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
