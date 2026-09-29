/**
 * Home — PRD §18, §17 (`/`).
 *
 * REBUILT AROUND THE JOURNEY-FIRST PRODUCT MODEL.
 *
 * SafarUp's product is a COMPLETE JOURNEY: a multi-day trip that starts in one
 * place, crosses at least one more, sleeps on the way and returns. The previous
 * version of this page led with "Popular destinations" — a grid of
 * `DestinationCard` — so a first-time visitor learned that SafarUp is a place
 * directory. That is the wrong first lesson, and everything below the hero
 * inherited it.
 *
 * So the hierarchy is now explicit and enforced by scale, not just by order:
 *
 *   1. Hero              — the product in one sentence, with a live route line
 *   2. Featured Journeys — the LARGEST commercial block on the page
 *   3. Explore by type   — full-bleed navy band, four tall photographic tiles
 *   4. Destinations      — deliberately the SMALLEST, quietest block
 *   5. How SafarUp works — journey-oriented funnel, not a booking funnel
 *   6. Why SafarUp       — photography, editorial rules, no bubble icons
 *   7. Private CTA       — the single solid orange focal point
 *   8. Footer            — `SiteFooter`, via `PublicLayout`
 *
 * Destinations are still here and are still read from the live API
 * (`fetchDestinations`, `?featured=true`) — they are the places our journeys
 * visit, and that is exactly how section 4 now describes them. The query, its
 * skeleton, its error state and its empty state are unchanged: the rail is
 * correct, and demoting it must not mean breaking it.
 *
 * Live inventory is never implied. Journey content is showcase material
 * (`data/showcase.js`, `IS_SHOWCASE`), so there is no price, departure date,
 * seat count, availability, rating, review count or traveller count anywhere
 * on this page. The showcase notice is stated calmly next to the journey
 * heading rather than as an alert, and every `TripCard` carries its own
 * "Example journey" tag.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL, organizationNode, websiteNode } from '../constants/site';
import { PATHS } from '../constants/routes';
import { fetchDestinations } from '../api/destinations.api';
import {
  HERO_IMAGES,
  SHOWCASE_NOTICE,
  SHOWCASE_TRIPS,
  tripPlaceCount,
  tripRouteSummary,
} from '../data/showcase';

import DestinationCard from '../components/destination/DestinationCard';
import DestinationCardSkeleton from '../components/destination/DestinationCardSkeleton';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';
import RouteLine from '../components/journey/RouteLine';
import TripCard from '../components/journey/TripCard';
import SmartImage from '../components/common/SmartImage';

/**
 * The reference journey.
 *
 * The hero shows a real route line rather than an illustration of "travel",
 * because a route line is the one device that makes the product model obvious
 * in a second: start, overnight, return. It is the FIRST trip in
 * `SHOWCASE_TRIPS`, so the journey the hero describes is the same object the
 * first card below links to, and its numbers are derived from the journey
 * itself rather than typed into the hero.
 */
const REFERENCE_TRIP = SHOWCASE_TRIPS[0] ?? null;

/**
 * Section 3 — the four trip types a SafarUp journey is built around.
 *
 * These are editorial categories, NOT filters and NOT links to a filtered
 * view. `/trips` keeps its filter in component state (see `TripsPage.jsx`),
 * so there is no URL that means "heritage journeys only" to link to; minting a
 * query string the page does not read would produce four tiles that silently
 * ignore the visitor. They are honest, non-interactive category markers, and
 * the band below them is where the actual journey link lives.
 *
 * Photography is stock, standing in for real trip imagery, and is labelled as
 * such here for the same reason `HERO_IMAGES` is: these are real, fetchable
 * URLs that are NOT photographs of these routes. Every URL below was
 * confirmed fetchable (HTTP 200) before being written here.
 */
const TRIP_TYPES = [
  {
    id: 'heritage',
    label: 'Heritage and Ruins',
    body: 'Stupa sites, excavated monasteries, old stone and the history that made the place.',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'temples',
    label: 'Temples and Pilgrimage',
    body: 'Temple towns, working shrines and circuits built around a place of worship.',
    image: 'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'hills',
    label: 'Hills and Forts',
    body: 'Hill routes, plateau stays, forts and the climb on the way to somewhere else.',
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'wildlife',
    label: 'Wildlife and Sanctuaries',
    body: 'Sanctuary country, forest reserves and seasonal wildlife — planned around the season.',
    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=900&q=70',
  },
];

/**
 * Section 5 — the funnel, rewritten for journeys.
 *
 * The previous four steps were Discover → Choose → Book → Travel, which is a
 * BOOKING funnel and quietly promises fixed departures and a checkout. None of
 * that exists: there is no trip inventory, no price and no payment, so
 * "Book" was the one word on the page that nothing behind it supported.
 *
 * The steps are now the ones a visitor actually takes, and each one names
 * something real: you read a whole itinerary, then you ask, then you travel.
 */
const HOW_IT_WORKS = [
  {
    step: 'Discover journeys',
    body: 'Start from a complete route — several places, several days, one journey — instead of a single pin on a map.',
  },
  {
    step: 'Understand it fully',
    body: 'Read the whole itinerary before you decide: every stop in order, where you sleep, what is included and what is not.',
  },
  {
    step: 'Request',
    body: 'Tell us your dates and group. You get a written proposal you can change, and nothing is charged at this stage.',
  },
  {
    step: 'Travel',
    body: 'One vehicle, named pickup points, a coordinator and the itinerary in your hand from the first pickup to the last drop.',
  },
];

/**
 * Section 6 — why SafarUp.
 *
 * 'Journeys, not pin drops' and 'Overnight and logistics included' are the two
 * claims that actually distinguish this product from a destination directory,
 * so they are stated as the first two blocks rather than buried. The orange
 * rule replaces the bubble icon the previous version used for every item —
 * four identical navy squares in a row read as decoration and competed with
 * the photography beside them (DESIGN_SYSTEM §13, one focal point per screen).
 */
const WHY_SAFARUP = [
  {
    title: 'Journeys, not pin drops',
    body: 'You are buying a route, not a place. Every SafarUp trip starts somewhere, crosses at least one more place, sleeps on the way and comes back — and the whole line is published before you commit.',
  },
  {
    title: 'Overnight and logistics included',
    body: 'Where you sleep, the vehicle, the driver and the named pickup points are part of the route we plan. They are not loose ends you are left to arrange at each stop.',
  },
  {
    title: 'The full itinerary, in writing',
    body: 'Every stop, in order, with the day it happens on, where you finish and where you sleep. You can read a SafarUp journey end to end without asking us a question.',
  },
  {
    title: 'Planned by people who walked it',
    body: 'Routes are built by travellers who have been on the ground, not resold from a wholesale list. If a season or a road will not work for what you want, we say so before you commit.',
  },
];

/** Section 6 photography. Stock, and labelled as such in the file header. */
const WHY_IMAGE =
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=70';

export default function HomePage() {
  /*
   * Destinations — UNCHANGED, and deliberately so.
   *
   * Same query key, same `?featured=true` filter, same limit, same skeleton,
   * same `ErrorState` with retry, same `EmptyState`. Section 4 is smaller and
   * quieter than section 2, but "supporting layer" must not mean "broken
   * layer": the rail is a real, working read of published destinations and
   * every one of its three states still has somewhere to render.
   */
  const featuredQuery = useQuery({
    queryKey: ['destinations', { featured: true, home: true }],
    queryFn: () => fetchDestinations({ featured: true, limit: 6 }),
  });

  const featured = featuredQuery.data?.items ?? [];

  /*
   * Site-level entities only.
   *
   * `organizationNode()` / `websiteNode()` are imported from `constants/site`
   * rather than re-spelled, so this page cannot publish a second Organization
   * node with different properties and force a consumer merging the graph to
   * guess which one wins.
   *
   * No `TouristTrip` / `ItemList` node is emitted while `IS_SHOWCASE` is true.
   * A machine-readable `TouristTrip` is a STRONGER claim than the visible
   * notice — a crawler and an answer engine never see the notice — and these
   * journeys are not live inventory. The journeys are linked from the page and
   * crawlable; they are simply not asserted as bookable entities.
   */
  const structuredData = useMemo(() => [organizationNode(), websiteNode()], []);

  useSeo({
    title: 'Complete multi-day journeys, planned end to end',
    // 158 characters, deliberately inside `truncate(description, 160)`. The
    // first draft ran to 190 and was cut mid-word ("...the return sh"), which
    // is a worse sentence than a slightly shorter one that survives whole.
    // It restates the h1 first, because that is the claim the page is making.
    description:
      'One trip. Many places. The whole journey planned. SafarUp runs complete multi-day journeys across several places, with every stop and overnight shown in full.',
    canonical: joinUrl(SITE_URL, PATHS.home),
    // The hero renders this photograph, so it is the share card. The page
    // advertising a generic image while showing real photography is a link
    // that unfurls as something the visitor never saw.
    image: REFERENCE_TRIP ? (HERO_IMAGES[REFERENCE_TRIP.slug] ?? null) : null,
    // No `robots`: Home is an indexable page. The showcase trips are labelled
    // as example content in the UI, which is a statement about those journeys —
    // it does not deindex the page that links to them.
    structuredData,
  });

  return (
    <>
      {/*
        1. HERO — full-bleed cinematic photograph.

        The scrim is a bottom-weighted gradient rather than a flat wash, so the
        top two-thirds of the image stays clean and the text sits on the dark
        end of it (DESIGN_SYSTEM §13: gradient overlays, not flat scrims).
        `on-dark` inverts the focus ring to white on this navy surface —
        brand-600 on navy-950 is 2.81:1 and fails 1.4.11 (index.css §7.1).
      */}
      <section className="on-dark relative isolate flex min-h-[32rem] flex-col justify-end overflow-hidden bg-navy-950">
        {REFERENCE_TRIP ? (
          <img
            src={HERO_IMAGES[REFERENCE_TRIP.slug]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-55"
            fetchPriority="high"
            decoding="async"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/80 to-navy-950/45"
        />

        <div className="relative mx-auto w-full max-w-shell px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-32 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
            Complete curated journeys
          </p>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
            One trip. Many places. The whole journey planned.
          </h1>

          <p className="measure mt-5 text-lg leading-relaxed text-white/80">
            A SafarUp journey is a complete multi-day trip across several places — it starts in
            one, crosses at least one more, sleeps on the way and comes back. The full itinerary
            is shown before you decide anything.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button as="link" to={PATHS.trips} size="lg">
              Explore journeys
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            <Button
              as="link"
              to={PATHS.planTrip}
              size="lg"
              variant="onDark"
            >
              Plan a private trip
            </Button>
          </div>

          {/*
            The route line, bottom-left, on the photograph.

            This is the product model rendered as a device rather than
            described in a sentence: filled marker where the journey starts, a
            distinct overnight glyph where you sleep, an outlined marker where
            it loops back. `tone="dark"` so the markers and labels read against
            the image rather than disappearing into it. The duration beside it
            is `trip.duration` — read off the journey, never re-typed, so the
            hero can never advertise a length its own itinerary contradicts.
          */}
          {REFERENCE_TRIP ? (
            <div className="mt-12 max-w-2xl">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-white">
                  {REFERENCE_TRIP.duration}
                </span>
                <span>
                  {tripPlaceCount(REFERENCE_TRIP)} places · {REFERENCE_TRIP.district}
                </span>
              </p>
              <div className="mt-3">
                <RouteLine route={REFERENCE_TRIP.route} size="sm" tone="dark" />
              </div>
              <p className="sr-only">
                Example journey: {tripRouteSummary(REFERENCE_TRIP)}. Itineraries are being
                published — departures, dates and prices are not yet live.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/*
        2. FEATURED JOURNEYS — the largest commercial block on the page.

        Dominance is enforced with size, not only with position. This is the
        only section that gets `py-20 sm:py-24`, the only heading that reaches
        `text-4xl sm:text-5xl`, and the only grid that runs to three columns
        with a double-width feature card. Section 4 (destinations) is capped
        well below all three numbers, so the two never read as peers.
      */}
      <section aria-labelledby="featured-journeys" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
                Featured journeys
              </p>
              <h2
                id="featured-journeys"
                className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-navy-900 sm:text-4xl lg:text-5xl"
              >
                Complete routes, published end to end
              </h2>
              <p className="measure mt-4 text-base leading-relaxed text-navy-600">
                Each of these is a whole trip: where it starts, every place on the way, where you
                sleep and where it finishes. Open any one and the full day-by-day itinerary is
                there to read.
              </p>
            </div>
            <Linkish to={PATHS.trips}>All journeys</Linkish>
          </div>

          {/*
            Showcase notice, placed beside the heading rather than above the
            page as a banner.

            It has to be unmissable — these are example journeys, not bookable
            departures — but it also must not read as a fault. A calm bordered
            row with a single `info` glyph states the demo status in one
            sentence and then gets out of the way. The only solid orange focal
            point on this screen is the "Explore journeys" CTA in the hero
            above (DESIGN_SYSTEM §13).
          */}
          <div className="mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50/70 p-4">
            <Icon name="info" className="mt-0.5 h-5 w-5 flex-none text-accent-700" />
            <p className="text-sm leading-relaxed text-navy-700">
              <span className="font-bold text-navy-900">{SHOWCASE_NOTICE.title}.</span>{' '}
              {SHOWCASE_NOTICE.body}
            </p>
          </div>

          <div className="mt-10">
            {SHOWCASE_TRIPS.length > 0 ? (
              <ul className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
                {SHOWCASE_TRIPS.map((trip, index) => (
                  /*
                    The span lives on the `<li>`, not on `TripCard`: a grid
                    track is only spanned by a DIRECT child of the grid, and the
                    `<li>` is that child. `md:` rather than `sm:` because the
                    grid only becomes multi-column at `md`. Identical to
                    `TripsPage`, so a journey looks the same everywhere it is
                    listed.
                  */
                  <li key={trip.slug} className={index === 0 ? 'md:col-span-2' : undefined}>
                    <TripCard trip={trip} priority={index === 0 ? 'feature' : 'default'} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="compass"
                title="No journeys are published yet"
                description="SafarUp publishes journeys as their itineraries are written and checked. In the meantime, tell us the route you have in mind and we will build it."
                action="Plan a Private Trip"
                actionTo={PATHS.planTrip}
              />
            )}
          </div>
        </div>
      </section>

      {/*
        3. EXPLORE BY TRIP TYPE — full-bleed navy band.

        Placed here for rhythm: it breaks the long white stretch between the
        journey grid and the quieter destination section, and it is the only
        full-bleed photographic band on the page besides the hero.

        The tiles are deliberately TALL (`min-h-80` on mobile, `aspect-[3/4]`
        from `sm` up) with a bottom-weighted scrim and white serif labels —
        DESIGN_SYSTEM §13, cinematic and editorial, rather than four small
        inset thumbnails in a box of padding.
      */}
      <section
        aria-labelledby="explore-by-type"
        className="on-dark relative isolate overflow-hidden bg-navy-950"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(50rem 26rem at 12% 0%, rgba(249,115,22,0.22), transparent 60%), radial-gradient(46rem 26rem at 88% 100%, rgba(37,99,235,0.28), transparent 60%)',
          }}
        />

        <div className="relative mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-300">
            Explore by trip type
          </p>
          <h2
            id="explore-by-type"
            className="mt-2 max-w-2xl font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl"
          >
            Four kinds of journey, and each one is a route
          </h2>
          <p className="measure mt-4 text-base leading-relaxed text-white/75">
            The type only tells you what a journey is about. It never tells you how many places
            you will see — every SafarUp journey crosses several of them.
          </p>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRIP_TYPES.map((type) => (
              <li key={type.id} className="flex">
                <div className="relative flex w-full flex-col overflow-hidden rounded-card">
                  <div className="relative min-h-80 sm:aspect-[3/4]">
                    <SmartImage
                      src={type.image}
                      alt=""
                      ratio={null}
                      className="absolute inset-0 h-full w-full"
                      imgClassName="h-full w-full object-cover"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/45 to-navy-950/10"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="font-display text-lg font-bold leading-snug tracking-tight text-white">
                        {type.label}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/75">{type.body}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Button as="link" to={PATHS.trips} size="lg">
              See the journeys
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/*
        4. EXPLORE DESTINATIONS AND PLACES — the SUPPORTING layer.

        Smallest heading on the page (`text-xl sm:text-2xl`, against section
        2's `text-4xl sm:text-5xl`), shortest padding (`py-12 sm:py-14`
        against `py-20 sm:py-24`), tightest grid gap (`gap-5` against `gap-7`)
        and a muted `bg-navy-50/60` band instead of white. The `DestinationCard`
        component is reused EXACTLY as it is on `/destinations` and `/explore`
        and is not modified — a smaller card would be a different component, and
        the same place should look the same wherever it is listed.

        The rail itself is untouched: same query, same skeleton, same error and
        empty states. See the comment on the query above.
      */}
      <section
        aria-labelledby="explore-destinations"
        className="border-t border-navy-100 bg-navy-50/60 py-12 sm:py-14"
      >
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-navy-500">
                Destinations and places
              </p>
              <h2
                id="explore-destinations"
                className="mt-1.5 font-display text-xl font-bold tracking-tight text-navy-900 sm:text-2xl"
              >
                The places our journeys visit
              </h2>
              <p className="measure mt-2 text-sm leading-relaxed text-navy-600">
                Destinations and places are the individual stops a SafarUp journey is built from.
                Browse them here if you already know where you want to go — otherwise start with a
                whole journey.
              </p>
            </div>
            <Linkish to={PATHS.destinations}>All destinations</Linkish>
          </div>

          <div className="mt-7">
            {featuredQuery.isPending ? (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <li key={index}>
                    <DestinationCardSkeleton />
                  </li>
                ))}
              </ul>
            ) : null}

            {featuredQuery.isError ? (
              <ErrorState
                error={featuredQuery.error}
                onRetry={() => featuredQuery.refetch()}
                title="We could not load featured destinations"
              />
            ) : null}

            {!featuredQuery.isPending && !featuredQuery.isError && featured.length === 0 ? (
              <EmptyState
                icon="mapPin"
                title="No destinations are published yet"
                description="SafarUp publishes destinations as they are prepared. In the meantime, tell us where you want to go and we will build the trip."
                action="Plan a Private Trip"
                actionTo={PATHS.planTrip}
              />
            ) : null}

            {featured.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {featured.map((destination) => (
                  <li key={destination.id}>
                    <DestinationCard destination={destination} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/*
        5. HOW SAFARUP WORKS — soft neutral, four journey-oriented steps.

        The connecting hairline is a single absolutely-positioned rule that runs
        behind the four numerals, drawn only from `sm` up where the steps are
        actually side by side. The numerals are opaque circles, so they cut the
        line rather than sitting on top of it — which is what makes it read as
        one continuous thread through the four steps instead of four separate
        dashes. Below `sm` the steps stack, the line would connect nothing, and
        it is removed rather than left as a stray rule across a column.
      */}
      <section aria-labelledby="how-it-works" className="bg-navy-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
            How SafarUp works
          </p>
          <h2
            id="how-it-works"
            className="mt-2 max-w-2xl font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
          >
            From a journey you can read to a trip you actually take
          </h2>
          <p className="measure mt-4 text-base leading-relaxed text-navy-600">
            Four steps, and none of them is a checkout. You read the whole plan first, and nothing
            is charged until there is a written proposal you are happy with.
          </p>

          <ol className="relative mt-12 grid gap-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-navy-200 sm:block"
            />
            {HOW_IT_WORKS.map((item, index) => (
              <li key={item.step} className="relative">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent-700 font-display text-lg font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 font-display text-lg font-bold tracking-tight text-navy-900">
                  {item.step}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/*
        6. WHY SAFARUP — two columns: a tall warm photograph, and four short
        blocks each led by a small orange rule.

        The rule (`h-1 w-10`) replaces the previous version's identical navy
        bubble icon on all four items. Four identical filled squares read as
        decoration, and DESIGN_SYSTEM §13 allows orange at ONE focal point per
        screen — four orange-ruled blocks plus a navy CTA pill in the same
        viewport fights for it. A hairline rule marks the item without filling
        it, and leaves the solid orange for section 7 alone.

        The photograph is `h-full` inside a grid cell that is at least `28rem`
        tall, so it is genuinely tall rather than a small inset in a box of
        padding.
      */}
      <section aria-labelledby="why-safarup" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
                Why SafarUp
              </p>
              <h2
                id="why-safarup"
                className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
              >
                We sell the whole trip, not a spot on a map
              </h2>
              <p className="measure mt-4 text-base leading-relaxed text-navy-600">
                A destination is one place. A SafarUp journey is several of them, connected by a
                route somebody has actually walked — and that is the difference the rest of this
                page is describing.
              </p>

              <ul className="mt-10 space-y-8">
                {WHY_SAFARUP.map((item) => (
                  <li key={item.title}>
                    <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-accent-700" />
                    <h3 className="mt-3 font-display text-lg font-bold tracking-tight text-navy-900">
                      {item.title}
                    </h3>
                    <p className="measure mt-2 text-sm leading-relaxed text-navy-600">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative min-h-[28rem] overflow-hidden rounded-card">
              <SmartImage
                src={WHY_IMAGE}
                alt=""
                ratio={null}
                priority
                className="absolute inset-0 h-full w-full"
                imgClassName="h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/*
        7. PRIVATE JOURNEY CTA — the one solid orange focal point on the page.

        `on-dark` for the focus ring. 'Talk to us' points at the private-trip
        enquiry rather than a `mailto:` or a `/contact` route: there is no
        contact endpoint, inbox or address wired up anywhere in the repo, and a
        link to one would 404. The enquiry form is where a question gets
        written down, which is the honest destination. Same reasoning as
        "Ask a question" on `TripDetailPage`.
      */}
      <section aria-labelledby="private-cta" className="on-dark bg-navy-900 py-16 sm:py-20">
        <div className="mx-auto flex max-w-shell flex-col items-start gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-300">
              Private journeys
            </p>
            <h2
              id="private-cta"
              className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl"
            >
              Want one of these routes on your own dates?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/80">
              Most SafarUp journeys are private. Tell us the dates, the people and the places you
              have in mind, and we will send a written proposal you can change before you accept
              it. No payment is taken at this stage.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button as="link" to={PATHS.planTrip} size="lg">
              Start planning
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            <Button
              as="link"
              to={PATHS.planTrip}
              size="lg"
              variant="onDark"
            >
              Talk to us
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Small text link used for a section-level "see all".
 *
 * `min-h-11` keeps it a 44px touch target on mobile (DESIGN_SYSTEM §7.2), and
 * `brand-700` is a token that exists — the earlier `text-brand-800` here
 * rendered as nothing at all, silently, because that step is not in the ramp.
 */
function Linkish({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-navy-50 hover:text-brand-600"
    >
      {children}
      <Icon name="arrowRight" className="h-4 w-4" />
    </Link>
  );
}
