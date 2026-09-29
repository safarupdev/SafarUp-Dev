import { Link } from 'react-router-dom';
import { Wordmark } from './SiteHeader';
import { PATHS } from '../../constants/routes';
import { SITE_NAME, SITE_TAGLINE } from '../../constants/site';

const FOOTER_GROUPS = [
  {
    heading: 'Explore',
    links: [
      { label: 'Destinations', to: PATHS.destinations },
      { label: 'Trips', to: PATHS.trips },
      { label: 'Travel Stories', to: PATHS.blog },
    ],
  },
  {
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
 * (PRD §172). `nav` elements are labelled so the three navigation landmarks
 * on a page — header, footer, bottom bar — are individually addressable.
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
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy-400">{group.heading}</h2>
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-400">Start planning</h2>
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
