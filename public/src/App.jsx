/**
 * Public route tree — PRD §17, restricted to what exists in Phase 2.
 *
 * Built:
 *   /                      home
 *   /destinations          list
 *   /destinations/:slug    detail
 *
 * Reserved (PRD §17 defines the route; the page is not built yet). These
 * render an explicit "not available yet" state rather than a 404 or a dead
 * link, because the product has already promised these destinations — the
 * private-trip CTA in API.destination.contract.md §2.3 and the Trips item in
 * the bottom navigation both point here. They are `noindex,follow` so an
 * unbuilt route never competes in search for the page that replaces it.
 *
 * `*` is a genuine 404, and emits no canonical URL.
 */

import { Route, Routes } from 'react-router-dom';

import PublicLayout from './components/layout/PublicLayout';
import { PATHS } from './constants/routes';

import HomePage from './pages/HomePage';
import DestinationsPage from './pages/DestinationsPage';
import DestinationDetailPage from './pages/DestinationDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import UnavailablePage, { UNAVAILABLE_COPY } from './pages/UnavailablePage';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={PATHS.home} element={<HomePage />} />
        <Route path={PATHS.destinations} element={<DestinationsPage />} />
        <Route path="/destinations/:slug" element={<DestinationDetailPage />} />

        {/* Reserved routes — see the note above. */}
        <Route path={PATHS.trips} element={<UnavailablePage {...UNAVAILABLE_COPY.trips} />} />
        <Route path={PATHS.planTrip} element={<UnavailablePage {...UNAVAILABLE_COPY.planTrip} />} />
        <Route path={PATHS.blog} element={<UnavailablePage {...UNAVAILABLE_COPY.blog} />} />
        <Route path={PATHS.login} element={<UnavailablePage {...UNAVAILABLE_COPY.login} />} />
        <Route
          path={`${PATHS.dashboardBookings}/*`}
          element={<UnavailablePage {...UNAVAILABLE_COPY.bookings} />}
        />
        {/* RESERVED, noindex: PRD §200.6/§200.9 have not decided whether a
            Place has a public page. Kept so "Places to visit" links resolve. */}
        <Route path={`${PATHS.places}/:slug`} element={<UnavailablePage {...UNAVAILABLE_COPY.place} />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
