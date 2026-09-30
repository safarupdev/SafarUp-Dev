/**
 * "Not available yet" state for a route that PRD §17 defines but that is not
 * built in this phase.
 *
 * This is a *state*, not a page of content. It exists so that a link which the
 * product has promised — the private-trip CTA in
 * API.destination.contract.md §2.3, the Trips item in the bottom navigation —
 * lands on an honest explanation rather than a 404 or a dead end. It is
 * `noindex,follow`: an unbuilt route must never compete in search for the real
 * page that will replace it.
 *
 * Nothing here is invented product copy about a feature that does not exist;
 * it states the one true thing.
 */

import { useSeo } from '../lib/seo';
import { PATHS } from '../constants/routes';
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';

export default function UnavailablePage({ title, message }) {
  useSeo({
    title,
    description: `${title} is not available on SafarUp yet.`,
    canonical: null,
    robots: 'noindex,follow',
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-700 ring-1 ring-accent-100">
        <Icon name="route" className="h-7 w-7" />
      </span>
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          {title}
        </h1>
        <p className="text-base leading-relaxed text-navy-600">{message}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button as="link" to={PATHS.destinations} size="lg">
          Explore destinations
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
        <Button as="link" to={PATHS.home} variant="secondary" size="lg">
          Back to home
        </Button>
      </div>
    </div>
  );
}

/** The shared copy for every reserved route, so the message cannot drift. */
export const UNAVAILABLE_COPY = {
  trips: {
    title: 'Group trips are not published yet',
    message:
      'SafarUp runs curated group departures, but no departures are on sale at the moment. Destinations are live now — start there.',
  },
  planTrip: {
    title: 'The private trip planner is not available yet',
    message:
      'Tell us where and when and our team will build the itinerary for you. The guided request form is not open yet.',
  },
  blog: {
    title: 'Travel stories are not published yet',
    message: 'No travel stories have gone live. Destinations are the best place to start exploring.',
  },
  login: {
    title: 'Accounts are not available yet',
    message:
      'SafarUp accounts open with the booking flow. Until then, everything published is readable without signing in.',
  },
  bookings: {
    title: 'Bookings are not available yet',
    message:
      'There is nothing to book yet — no departures are on sale. Your bookings and invoices will live here once they are.',
  },
  place: {
    title: 'Place pages are not published yet',
    message:
      'This place is part of a destination we have published, but it does not have a page of its own yet.',
  },
};
