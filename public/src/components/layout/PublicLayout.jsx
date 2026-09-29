/**
 * Page shell — the layout every public route renders inside.
 *
 * Composition differs by breakpoint by design (PRD §167): a sticky expanded
 * header and multi-column content on desktop; a compact brand bar plus the
 * fixed bottom navigation on mobile. The two hand over at a single shared
 * `lg` breakpoint (see BottomNav.jsx and SiteHeader.jsx) so exactly one
 * primary global nav is present at every width. There is no hamburger
 * anywhere in this file, because a hamburger as global mobile navigation is
 * prohibited (PRD §168, DESIGN_SYSTEM.md §5).
 */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import BottomNav from './BottomNav';

export default function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Client-side navigation does not reset scroll; a destination page that
    // opens halfway down is a broken page. `instant` beats a smooth scroll
    // here because smooth scrolling fights the reduced-motion override and
    // delays the visitor seeing the top of a new page.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only rounded-b-lg bg-navy-900 px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
        <Outlet />
      </main>

      {/*
        Bottom-nav clearance, reserved ONCE here for every route. It used to
        be applied per page — and only DestinationsPage did it at all — so the
        fixed bar sat on top of the footer's last legal line on every other
        route.

        `.pb-nav-clearance` (index.css) derives the value from the same tokens
        the bar is built from — `spacing.floating-nav` +
        `spacing.floating-nav-gap` + `env(safe-area-inset-bottom)` — and
        releases itself at `lg`, the breakpoint where SiteHeader's expanded nav
        replaces the bar. Nothing here is a magic number, so the reservation
        cannot drift when the bar's height changes.

        Deliberately NOT `.pb-floating-nav`: Tailwind auto-generates a
        `pb-floating-nav` utility from the `spacing.floating-nav` token, and
        because utilities are emitted after components, that generated rule
        wins the cascade and drops the safe-area term at every width.
      */}
      <div className="pb-nav-clearance">
        <SiteFooter />
      </div>

      <BottomNav />
    </div>
  );
}
