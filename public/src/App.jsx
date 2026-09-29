/**
 * Public route tree — PRD §17.
 *
 * Built (the primary public journey, all fully realised):
 *   /                      home
 *   /explore               discovery: filters + client-side search
 *   /destinations          list
 *   /destinations/:slug    detail
 *   /trips                 trip discovery (showcase content)
 *   /trips/:slug           trip detail (structured travel product)
 *   /plan-trip             private-trip enquiry
 *   /about                 product story
 *
 * Reserved (PRD §17 defines the route; the page is not built yet). These
 * render an explicit "not available yet" state rather than a 404 or a dead
 * link, because the product has already promised these surfaces. They are
 * `noindex,follow` so an unbuilt route never competes in search for the page
 * that replaces it. None of them appear in the primary journey or the header
 * navigation.
 *
 * `*` is a genuine 404, and emits no canonical URL.
 */

import { Route, Routes } from 'react-router-dom';

import PublicLayout from './components/layout/PublicLayout';
import { PATHS } from './constants/routes';

import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import DestinationsPage from './pages/DestinationsPage';
import DestinationDetailPage from './pages/DestinationDetailPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import PlanTripPage from './pages/PlanTripPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';
import UnavailablePage, { UNAVAILABLE_COPY } from './pages/UnavailablePage';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={PATHS.home} element={<HomePage />} />
        <Route path={PATHS.explore} element={<ExplorePage />} />
        <Route path={PATHS.destinations} element={<DestinationsPage />} />
        <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
        <Route path={PATHS.trips} element={<TripsPage />} />
        <Route path="/trips/:slug" element={<TripDetailPage />} />
        <Route path={PATHS.planTrip} element={<PlanTripPage />} />
        <Route path={PATHS.about} element={<AboutPage />} />

        {/* Reserved routes — see the note above. */}
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
