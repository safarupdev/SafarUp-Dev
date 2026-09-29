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
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 px-4 py-2.5 shadow-nav backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:hidden"
      // Reserve exactly the height of the bottom navigation so this bar rests
      // on top of it rather than under it.
      style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.625rem)' }}
    >
      <div className="mx-auto flex max-w-shell items-center gap-3">
        {hint ? <p className="min-w-0 flex-1 text-xs leading-tight text-navy-600">{hint}</p> : null}
        <Link
          to={to}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-accent-600 px-5 text-[0.95rem] font-semibold text-white shadow-sm transition-colors duration-150 ease-standard hover:bg-accent-700 active:bg-accent-800"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
