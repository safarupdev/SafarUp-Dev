/**
 * Bottom navigation — FLOATING GLASS BAR (PRD §168, DESIGN_SYSTEM.md §5).
 *
 * This is the primary global navigation on public mobile. A hamburger is
 * prohibited without explicit product-owner approval; none exists in this app.
 *
 * Everything DESIGN_SYSTEM.md §5 requires the pattern to define is here:
 *   active state   — filled pill with a soft glow, plus `aria-current="page"`
 *   inactive state — neutral, still a full-size touch target
 *   icons          — one family, one weight (common/Icon.jsx)
 *   labels         — text under every icon; never icon-only
 *   safe area      — `env(safe-area-inset-bottom)` padding, plus a visible gap
 *   touch targets  — 44×44px minimum at rest
 *   scroll         — fixed, so it is always reachable; PublicLayout reserves the
 *                    bar's whole footprint once, for every route
 *   accessibility  — real links, real list, and an opaque-enough glass tint
 *   transitions    — colour and shadow only, no movement
 *   contextual     — a sticky action bar may sit ABOVE this bar, never on top
 *                    of it (§195.2)
 *
 * WHY IT FLOATS. The bar is inset from all four viewport edges (side gutters,
 * a bottom gap and the safe-area inset) and the surrounding area is
 * `pointer-events-none`, so the content behind it stays clickable. It reads as
 * a tray floating over the page rather than a strip glued to the viewport, and
 * the visible gap is what tells the eye that.
 *
 * GLASS + CONTRAST. `backdrop-blur` buys atmosphere, not legibility: browsers
 * drop it entirely without `backdrop-filter` support, and even where it works
 * it only softens whatever is behind the bar. So the surface carries its own
 * tint at `bg-white/90` — 85% where blur is supported (`supports-`) — and the
 * label colours are picked against the WORST case of that tint over pure black
 * imagery. The container is `pointer-events-none` with the bar re-enabling it,
 * so a stray click in the gap never lands on a nav item.
 *
 * BREAKPOINT. This bar is the primary global nav below `lg` (1024px); from
 * `lg` up, SiteHeader's expanded nav takes over. `lg` is the single boundary
 * used by both, which is what closes the old 768–1023px tablet band that had
 * `md:hidden` here and `lg:flex` there and therefore no nav at all.
 *
 * RESERVED ITEMS. A destination whose page is not built yet is de-emphasised
 * by SHAPE, not by fading it: an italic label and a soft, outlined "active"
 * pill instead of a filled one, plus a screen-reader-only note. WCAG contrast
 * is a hard requirement over arbitrary imagery behind the glass, so signalling
 * "unbuilt" with a lighter grey is not available.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS, isCurrentPath } from '../../constants/navigation';
import Icon from '../common/Icon';

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      // The bottom gap is a literal 0.75rem PLUS the safe-area inset, not
      // instead of it: a home indicator must not eat into the space that makes
      // the bar read as floating. It is deliberately tighter than the
      // `floating-nav-gap` token (1.25rem) that the reserved clearance is
      // built from, which leaves 0.5rem of breathing room between the last
      // line of page copy and the top of the bar.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:hidden"
    >
      <ul
        // `min-h-floating-nav` and the clearance PublicLayout reserves are both
        // derived from the `spacing.floating-nav` token, so the tray and the
        // space reserved for it cannot drift apart. `min-h-11` on each item
        // below is the 44px touch-target floor the bar has to clear, not its
        // height.
        className="pointer-events-auto flex min-h-floating-nav w-full max-w-md items-stretch gap-0.5 rounded-[1.75rem] border border-white/70 bg-white/90 px-1.5 py-1.5 shadow-floating-nav ring-1 ring-inset ring-navy-900/5 backdrop-blur-glass supports-[backdrop-filter]:bg-white/85"
      >
        {NAV_ITEMS.map((item) => {
          // `match` is the single definition of current-ness; `end` binds the
          // NavLink's own `aria-current` to the same field so the highlight and
          // the announced state cannot disagree.
          const current = isCurrentPath(item, pathname);
          const reserved = item.status === 'reserved';

          return (
            <li key={item.key} className="flex flex-1">
              <NavLink
                to={item.to}
                end={item.match === 'exact'}
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[0.7rem] font-semibold leading-none tracking-tight transition-all duration-200 ease-standard ${
                  current
                    ? reserved
                      ? 'bg-navy-900/10 text-navy-900 ring-1 ring-inset ring-navy-900/15'
                      : 'bg-navy-900 text-white shadow-[0_2px_12px_-2px_rgb(19_28_43/0.35)]'
                    : 'text-navy-600 hover:bg-navy-900/5 hover:text-navy-900'
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                <span className={`whitespace-nowrap ${reserved ? 'italic' : ''}`}>
                  {item.shortLabel}
                  {reserved ? <span className="sr-only"> — {item.statusLabel}</span> : null}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
