/**
 * Journeys — showcase journey discovery (PRD §19, §20). The URL stays
 * `/trips`; the page is presented as JOURNEYS because the product is the
 * journey, not the destination (see `data/showcase.js`).
 *
 * A SafarUp trip is a complete multi-day route: it starts somewhere, crosses
 * at least one more place, sleeps on the way, and returns. So this page leads
 * with `TripCard`, which carries the route line and the place count on every
 * card — a grid of "place + photo" would collapse the product back into a
 * destination directory.
 *
 * `tripTemplates` does not exist in the backend yet, so there is no live trip
 * data. Everything here is clearly-labelled showcase content and says so on
 * the page. It never implies a departure, a date, a price or availability.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL } from '../constants/site';
import { PATHS } from '../constants/routes';
import { HERO_IMAGES, IS_SHOWCASE, SHOWCASE_NOTICE, SHOWCASE_TRIPS } from '../data/showcase';

import TripCard from '../components/journey/TripCard';
import EmptyState from '../components/states/EmptyState';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';
import Icon from '../components/common/Icon';

/**
 * The listing itself is not an entity and has no photograph of its own, so the
 * first journey's hero stands in for the share card. Anything better would be
 * page-level art that does not exist yet; falling back to the site default was
 * the previous behaviour and it meant `/trips` unfurled as the generic site
 * card while the page it describes is entirely photographs. Revisit when real
 * trip photography ships with the TripTemplate API.
 */
const SHARE_IMAGE = HERO_IMAGES[SHOWCASE_TRIPS[0].slug] ?? null;

/**
 * Journey filters.
 *
 * The chips are fixed editorial categories, but what they MATCH is never
 * hand-listed: each chip carries the words it looks for inside the journey's
 * own `tripType`, so a chip can never quietly disagree with the trip it is
 * hiding or showing. A chip that currently matches nothing stays visible and
 * shows the honest empty state — hiding it would make the catalogue look
 * complete when it is not.
 */
const JOURNEY_FILTERS = [
  { id: 'all', label: 'All journeys' },
  { id: 'heritage', label: 'Heritage', tokens: ['heritage'] },
  { id: 'pilgrimage', label: 'Pilgrimage', tokens: ['spiritual', 'pilgrimage'] },
  { id: 'hills', label: 'Hills', tokens: ['hills', 'nature'] },
  { id: 'wildlife', label: 'Wildlife', tokens: ['wildlife', 'seasonal'] },
];

/**
 * Sort orders. `nights` is the only numeric duration the data actually has,
 * so "shortest first" sorts on that rather than parsing the display string
 * `2 Days / 1 Night` — a hand-parsed copy of `duration` would be a second
 * source of truth for how long a journey is.
 */
const JOURNEY_SORTS = [
  { id: 'curated', label: 'Curator’s order' },
  { id: 'shortest', label: 'Shortest first' },
  { id: 'longest', label: 'Longest first' },
  { id: 'az', label: 'A–Z' },
];

/**
 * What every SafarUp journey carries, stated once on the listing so the
 * question "what is actually included?" is answered before the visitor opens
 * a single journey. Each journey still lists its own inclusions and
 * exclusions in full — this is the shared spine, not a substitute.
 */
const ALWAYS_INCLUDED = [
  {
    icon: 'mapPin',
    title: 'Pickup and drop',
    body: 'Collected and dropped at named points in the district, confirmed with the group before the journey starts.',
  },
  {
    icon: 'route',
    title: 'One vehicle, one driver',
    body: 'The group travels together in a single vehicle for the whole route, not reassembled at each stop.',
  },
  {
    icon: 'home',
    title: 'A night on the way',
    body: 'A journey sleeps where it passes through, so accommodation is part of the route rather than an add-on.',
  },
  {
    icon: 'sparkle',
    title: 'Meals as planned',
    body: 'Meals are listed against each day, so you can read exactly what is and is not covered before you go.',
  },
  {
    icon: 'users',
    title: 'A trip coordinator',
    body: 'One person coordinating the group, the vehicle and the stays from the first pickup to the last drop.',
  },
  {
    icon: 'landmark',
    title: 'The full itinerary',
    body: 'Every stop, in order, published on the journey page — including where you sleep and where you end up.',
  },
];

export default function TripsPage() {
  /*
   * Filter and sort live in component state, not the query string. Unlike the
   * destination list, this page is `noindex` showcase content and a filtered
   * view of three example journeys is not a document anyone needs to share or
   * crawl. Putting it in the URL would mint a permanent permutation of a page
   * that is not meant to be indexed.
   */
  const [filterId, setFilterId] = useState('all');
  const [sortId, setSortId] = useState('curated');

  const activeFilter = JOURNEY_FILTERS.find((filter) => filter.id === filterId) ?? JOURNEY_FILTERS[0];

  /**
   * The listing is a set of showcase journeys, not live TripTemplate
   * inventory. Listing each one as a `TouristTrip` with a `url` tells a
   * crawler and an answer engine that SafarUp operates these departures —
   * which is exactly what the page's own notice says it cannot. Suppressed
   * while `IS_SHOWCASE`; the page stays public, linked and fully navigable.
   */
  const structuredData = useMemo(
    () =>
      IS_SHOWCASE
        ? []
        : [
            {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'SafarUp journeys',
              itemListElement: SHOWCASE_TRIPS.map((trip, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'TouristTrip',
                  name: trip.title,
                  description: trip.summary,
                  url: joinUrl(SITE_URL, PATHS.trips, trip.slug),
                },
              })),
            },
          ],
    []
  );

  useSeo({
    title: 'Journeys',
    description:
      'Multi-day journeys across Bihar — temples, heritage, hills and winter wildlife, planned as a complete route you can read end to end before you decide.',
    // `noindex` alongside a self-referential `canonical` asserts "this is the
    // indexable version" and "do not index it" in the same head. While the
    // itineraries are showcase content there is no indexable version of this
    // page, so the canonical is withdrawn — the same answer `NotFoundPage` and
    // `UnavailablePage` already give.
    canonical: IS_SHOWCASE ? null : joinUrl(SITE_URL, PATHS.trips),
    // The page used to render hero photography while advertising the generic
    // site share card. Real image, same map the cards render from.
    image: SHARE_IMAGE,
    robots: IS_SHOWCASE ? 'noindex,follow' : null,
    structuredData,
  });

  const visibleTrips = useMemo(() => {
    const filtered = SHOWCASE_TRIPS.filter((trip) => {
      if (activeFilter.id === 'all') return true;
      const type = (trip.tripType ?? '').toLowerCase();
      return activeFilter.tokens.some((token) => type.includes(token));
    });

    const sorted = [...filtered];
    if (sortId === 'shortest') sorted.sort((a, b) => (a.nights ?? 0) - (b.nights ?? 0));
    if (sortId === 'longest') sorted.sort((a, b) => (b.nights ?? 0) - (a.nights ?? 0));
    if (sortId === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title));

    return sorted;
  }, [activeFilter, sortId]);

  return (
    <>
      <section className="on-dark relative isolate overflow-hidden bg-navy-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(60rem 30rem at 15% -10%, rgba(249,115,22,0.28), transparent 60%), radial-gradient(50rem 30rem at 90% 10%, rgba(37,99,235,0.35), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-shell px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs font-medium text-white/70">
              <li>
                <Link to={PATHS.home} className="rounded hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white">Journeys</li>
            </ol>
          </nav>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Journeys</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Complete multi-day routes, published end to end
          </h1>
          <p className="measure mt-5 text-lg leading-relaxed text-white/80">
            A SafarUp journey starts in one place, crosses at least one more, sleeps on the way and
            comes back. Every itinerary below is written out in full — every stop, every night, and
            where you end up — before you decide anything.
          </p>
        </div>

        {/*
          Showcase notice.

          Designed as part of the page rather than bolted on as an alert: the
          content is example material, and saying so calmly is more honest than
          a red banner that reads as a fault. The amber here is the small label
          and its icon only — the single solid orange focal point further down
          is the private-trip CTA (DESIGN_SYSTEM §13).
        */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-shell items-start gap-4 px-4 py-6 sm:px-6 lg:px-8">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-accent-300"
            >
              <Icon name="info" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-300">
                {SHOWCASE_NOTICE.title}
              </p>
              <p className="measure mt-1.5 text-sm leading-relaxed text-white/75">{SHOWCASE_NOTICE.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="journey-list" className="mx-auto max-w-shell px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <h2 id="journey-list" className="sr-only">
          Browse journeys
        </h2>

        {/* Filters and sort — the DESIGN_SYSTEM §6 discovery controls. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">
              Filter by
            </legend>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
              {JOURNEY_FILTERS.map((filter) => (
                <Chip key={filter.id} active={filter.id === activeFilter.id} onClick={() => setFilterId(filter.id)}>
                  {filter.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-3">
            <label htmlFor="journey-sort" className="text-xs font-bold uppercase tracking-wider text-navy-500">
              Sort
            </label>
            <select
              id="journey-sort"
              value={sortId}
              onChange={(event) => setSortId(event.target.value)}
              className="min-h-11 rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-800 shadow-sm focus:border-brand-500"
            >
              {JOURNEY_SORTS.map((sort) => (
                <option key={sort.id} value={sort.id}>
                  {sort.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-4 text-sm text-navy-600" role="status">
          {visibleTrips.length} {visibleTrips.length === 1 ? 'journey' : 'journeys'}
          {activeFilter.id === 'all' ? ' published so far' : ` in ${activeFilter.label.toLowerCase()}`}.
        </p>

        {visibleTrips.length > 0 ? (
          <ul className="mt-6 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {visibleTrips.map((trip, index) => (
              // The span lives on the `<li>`, not on `TripCard`: a grid track
              // is only spanned by a DIRECT child of the grid, and the `<li>`
              // is that child. `md:` rather than `sm:` because the grid itself
              // only becomes multi-column at `md`.
              <li key={trip.slug} className={index === 0 ? 'md:col-span-2' : undefined}>
                <TripCard trip={trip} priority={index === 0 ? 'feature' : 'default'} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <EmptyState
              icon="compass"
              title={`No ${activeFilter.label.toLowerCase()} journeys are published yet.`}
              description="SafarUp publishes journeys as their itineraries are written and checked. This filter currently matches none of them — it will fill up. In the meantime, tell us the route you have in mind and we will build it."
              action="Show all journeys"
              onAction={() => setFilterId('all')}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="always-included" className="border-y border-navy-100 bg-navy-50/70 py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-700">The same on every route</p>
          <h2
            id="always-included"
            className="mt-2 max-w-2xl font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
          >
            What every SafarUp journey includes
          </h2>
          <p className="measure mt-3 text-sm leading-relaxed text-navy-600">
            Whichever journey you open, these are the parts that are already handled. Each journey
            page then lists its own inclusions and exclusions in full, including the entry fees and
            costs that are yours to pay on the day.
          </p>

          <ul className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ALWAYS_INCLUDED.map((item) => (
              <Card as="li" key={item.title} variant="outline" pad="lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-navy-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{item.body}</p>
              </Card>
            ))}
          </ul>
        </div>
      </section>

      {/* `on-dark` so the focus ring inverts to white on this navy surface —
          brand-600 on navy-950 is 2.81:1 and fails 1.4.11 (index.css §7.1). */}
      <section className="on-dark bg-navy-900 py-16">
        <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Want one of these routes as a private journey?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              Most SafarUp journeys are private, built around your dates and your group. Tell us the
              route you have in mind — the enquiry is a short form, and no payment is taken at that
              stage.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button as="link" to={PATHS.planTrip} size="lg">
              Plan a Private Trip
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            <Button
              as="link"
              to={PATHS.destinations}
              size="lg"
              variant="onDark"
            >
              Browse destinations
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
