import { Link, NavLink, useLocation } from 'react-router-dom';
import { DESKTOP_NAV } from '../../constants/navigation';
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
 * Desktop header — expanded navigation (DESIGN_SYSTEM.md §4).
 *
 * There is no hamburger here and none is allowed as global mobile navigation
 * (PRD §168, DESIGN_SYSTEM.md §5): the mobile global navigation is
 * `BottomNav.jsx`. This header collapses to a compact wordmark bar on mobile,
 * which is branding and a single contextual action — not a menu.
 */
export default function SiteHeader() {
  const { pathname, search } = useLocation();
  const exploreTo = `${destinationsPath()}${search || ''}`;

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {DESKTOP_NAV.map((item) => {
            const to = item.key === 'destinations' ? exploreTo : item.to;
            const active = pathname === to || (item.key !== 'home' && pathname.startsWith(to));
            return (
              <NavLink
                key={item.key}
                to={to}
                aria-current={active ? 'page' : undefined}
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
          <Button as="link" to={PATHS.login} variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button as="link" to={PATHS.planTrip} size="sm" className="hidden sm:inline-flex">
            Plan a Private Trip
          </Button>
          <Button as="link" to={destinationsPath()} size="sm" className="sm:hidden" aria-label="Explore destinations">
            <Icon name="compass" className="h-4 w-4" />
            Explore
          </Button>
        </div>
      </div>
    </header>
  );
}
