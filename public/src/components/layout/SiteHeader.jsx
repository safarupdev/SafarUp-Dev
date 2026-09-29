import { Link, NavLink, useLocation } from 'react-router-dom';
import { DESKTOP_NAV, isCurrentPath } from '../../constants/navigation';
import { PATHS, destinationsPath } from '../../constants/routes';
import Button from '../common/Button';
import Icon from '../common/Icon';

/**
 * Wordmark. One definition for the whole app so the brand mark cannot drift
 * between the header, the footer and the not-found page.
 */
export function Wordmark({ tone = 'light' }) {
  return (
    <Link
      to={PATHS.home}
      className="inline-flex items-center gap-2 rounded text-lg font-extrabold tracking-tight"
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-base font-black text-white ${
          tone === 'light' ? 'bg-navy-900' : 'bg-accent-500'
        }`}
      >
        S
      </span>
      <span className={tone === 'light' ? 'text-navy-900' : 'text-white'}>SafarUp</span>
    </Link>
  );
}

/**
 * Destination filters are the only query-string parameters `/destinations`
 * understands (`destinationsPath()` in constants/routes.js). Rebuilding the
 * href through that helper means the header can never forward a stranger's
 * query — `/destinations?utm_source=x` or `?page=4` used to be carried over
 * from whatever page the visitor happened to be on.
 */
function destinationsHref(search) {
  const params = new URLSearchParams(search);
  return destinationsPath({
    district: params.get('district') || undefined,
    category: params.get('category') || undefined,
  });
}

/**
 * Desktop header — expanded navigation (DESIGN_SYSTEM.md §4).
 *
 * There is no hamburger here and none is allowed as global mobile navigation
 * (PRD §168, DESIGN_SYSTEM.md §5): the mobile global navigation is
 * `BottomNav.jsx`. This header collapses to a compact wordmark bar below
 * `lg`, which is branding and a single contextual action — not a menu.
 *
 * BREAKPOINT. `lg` (1024px) is the one boundary shared with `BottomNav.jsx`,
 * and it is chosen to match the widest layout this header has to hold: the
 * wordmark, six nav items and both CTAs. Below `lg` the header nav is
 * `hidden` and the bottom bar is the primary global nav; at and above `lg` it
 * is the other way round. There is no width — 768–1023px in particular, which
 * previously had `md:hidden` on the bar and `lg:flex` here — with no global
 * navigation, and never two at once.
 */
export default function SiteHeader() {
  const { pathname, search } = useLocation();
  const exploreTo = destinationsHref(search);

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {DESKTOP_NAV.map((item) => {
            // `item.to` is a bare path, so `isCurrentPath` judges the pathname
            // alone; the query string rides along in the href only. Folding it
            // into the comparison left `/destinations?district=x` with no
            // current nav item at all.
            const to = item.forwardFilters ? exploreTo : item.to;
            const active = isCurrentPath(item, pathname);
            return (
              <NavLink
                key={item.key}
                to={to}
                end={item.match === 'exact'}
                className={`rounded-full px-4 py-2 text-[0.95rem] font-semibold transition-colors duration-150 ease-standard ${
                  active ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-50 hover:text-navy-900'
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* CTAs are for `lg` and up only, where the header has room and where
              the expanded nav is present. Below `lg` the bar carries a single
              contextual "Explore" jump instead; the second CTA used to appear
              from `sm` up, which stacked three controls into the narrow band
              between the two navs. */}
          <Button as="link" to={PATHS.login} variant="ghost" size="sm" className="hidden lg:inline-flex">
            Sign in
          </Button>
          <Button as="link" to={PATHS.planTrip} size="sm" className="hidden lg:inline-flex">
            Plan a Private Trip
          </Button>
          <Button as="link" to={destinationsPath()} size="sm" className="lg:hidden">
            <Icon name="globe" className="h-4 w-4" />
            Explore
          </Button>
        </div>
      </div>
    </header>
  );
}
