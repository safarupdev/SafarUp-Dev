/**
 * Bottom navigation — BINDING (PRD §168, DESIGN_SYSTEM.md §5).
 *
 * This is the primary global navigation on public mobile. A hamburger is
 * prohibited without explicit product-owner approval; none exists in this app.
 *
 * Everything DESIGN_SYSTEM.md §5 requires the pattern to define is here:
 *   active state   — filled pill + `aria-current="page"`
 *   inactive state — neutral, still a full-size touch target
 *   icons          — one family, one weight (common/Icon.jsx)
 *   labels         — text under every icon; never icon-only
 *   safe area      — `env(safe-area-inset-bottom)` padding
 *   touch targets  — 44×44px minimum at rest
 *   scroll         — fixed, so it is always reachable; the page reserves its
 *                    height via `pb-safe-nav` so nothing hides behind it
 *   accessibility  — real links, real list, `aria-current`, no ARIA roles
 *                    invented
 *   transitions    — colour only, and disabled under reduced motion
 *   contextual     — a sticky action bar may sit ABOVE this bar, never on top
 *                    of it (§195.2)
 */

import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS, isCurrentPath } from '../../constants/navigation';
import Icon from '../common/Icon';

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 shadow-nav backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden"
    >
      <ul
        className="mx-auto grid max-w-shell grid-cols-5 items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map((item) => {
          const current = isCurrentPath(item, pathname);
          return (
            <li key={item.key} className="flex">
              <NavLink
                to={item.to}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[0.7rem] font-semibold leading-tight transition-colors duration-150 ease-standard ${
                  current ? 'text-navy-900' : 'text-navy-500 hover:text-navy-800'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ease-standard ${
                        (isActive || current) ? 'bg-navy-900 text-white' : 'text-navy-500'
                      }`}
                    >
                      <Icon name={item.icon} className="h-5 w-5" />
                    </span>
                    <span className={current ? 'underline decoration-2 underline-offset-4' : undefined}>
                      {item.shortLabel}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
