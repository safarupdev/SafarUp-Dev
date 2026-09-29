/**
 * Sticky action bar — DESIGN_SYSTEM.md §5, PRD §195.2.
 *
 * Sits **above** the bottom navigation so the two never collide. It is
 * mobile-only by design: on desktop the same action lives in the page as an
 * inline CTA, because a viewport-pinned bar competes with real content on a
 * wide screen and desktop is composed independently (§167).
 *
 * A persistent conversion action is the single highest-leverage element on a
 * destination page: §22 — "the destination page must convert discovery into
 * travel intent".
 */

import { Link } from 'react-router-dom';

export default function StickyActionBar({ to, label, hint }) {
  return (
    /*
     * The wrapper is `inset-x-0`, transparent and `pointer-events-none`: it
     * spans the area behind the floating nav only to reserve vertical space, so
     * it must not paint there. Painting it white turned the nav's 16px gutters
     * from page content into a white plinth with a full-width hairline cutting
     * across — the exact opposite of the nav floating above the content, which
     * is the single most distinctive mobile decision in the app.
     *
     * The visible bar is its own inset pill that stops ABOVE the nav
     * (`bottom-[calc(...)]`) and never extends under it.
     */
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 sm:hidden"
      // Reserve exactly the height of the bottom navigation so this bar rests
      // on top of it rather than under it. These must stay equal to
      // `spacing.floating-nav` + `spacing.floating-nav-gap`, the same two tokens
      // `.pb-nav-clearance` derives from in index.css.
      style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.625rem)' }}
    >
      <div className="pointer-events-auto mx-3 mb-2 flex items-center gap-3 rounded-full border border-navy-100 bg-white/95 p-2 pl-4 shadow-nav backdrop-blur supports-[backdrop-filter]:bg-white/90">
        {hint ? (
          <p className="min-w-0 flex-1 truncate text-xs leading-tight text-navy-600">{hint}</p>
        ) : null}
        <Link
          to={to}
          className="inline-flex min-h-11 flex-none items-center justify-center rounded-full bg-accent-700 px-5 text-[0.95rem] font-semibold text-white shadow-sm transition-colors duration-150 ease-standard hover:bg-accent-800 active:bg-accent-900"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
