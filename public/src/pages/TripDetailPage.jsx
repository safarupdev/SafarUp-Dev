/**
 * Trip Detail — the flagship journey page (PRD §185–§194).
 *
 * SafarUp's product is the JOURNEY: a complete multi-day route across several
 * locations, with an overnight stay and a return. So the page is composed
 * around the shape of that journey, not around a list of facts about a place:
 *
 *   hero (route line in the image) → journey at a glance → quick facts
 *   → destination link → overview & highlights → pickup/drop → ITINERARY
 *   → places covered (by location) → history & culture → accommodation
 *   → meals → vehicle → inclusions → exclusions → best time → important
 *   information → final CTA
 *
 * Every number on this page is DERIVED from the journey's own `route` and
 * `itinerary` (`tripFacts`, `tripLocationClusters`, `tripRouteSummary`). A
 * hand-typed copy of any of them would be free to disagree with the day plan
 * printed directly beneath it, and a journey whose summary contradicts its
 * own itinerary is worse than no journey at all.
 *
 * Demo data notice: trip content is showcase material (`data/showcase.js`).
 * The page says so plainly rather than implying inventory, and there is no
 * price, departure date, seat count, availability, rating or traveller count
 * anywhere on it.
 */

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from '../constants/site';
import { PATHS, destinationPath } from '../constants/routes';
import {
  HERO_IMAGES,
  IS_SHOWCASE,
  SHOWCASE_NOTICE,
  findShowcaseTrip,
  tripFacts,
  tripLocationClusters,
  tripNights,
  tripPlaceCount,
  tripRouteSummary,
} from '../data/showcase';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Icon from '../components/common/Icon';
import ItineraryTimeline from '../components/journey/ItineraryTimeline';
import JourneyAtAGlance from '../components/journey/JourneyAtAGlance';
import RouteLine from '../components/journey/RouteLine';
import StickyActionBar from '../components/layout/StickyActionBar';
import NotFoundPage from './NotFoundPage';

/**
 * Glyphs for the derived quick facts. Keyed by the `key` that
 * `tripFacts(trip)` emits, so a fact the helper adds later picks up its glyph
 * here rather than rendering an unlabelled cell. Every name is verified
 * against `components/common/Icon.jsx` — a typo renders as nothing at all
 * rather than failing loudly.
 */
const FACT_ICONS = {
  duration: 'clock',
  nights: 'home',
  route: 'route',
  places: 'mapPin',
  season: 'sun',
  group: 'users',
};

/**
 * Section shell.
 *
 * No shell/padding of its own: every section on this page sits inside the
 * `max-w-shell` grid below, and the previous version re-applied
 * `max-w-shell px-4` here as well — so the whole body of the page was inset
 * twice on mobile and sat out of line with the hero, the quick-facts band and
 * the rail beside it. This renders rhythm and a heading; the container owns
 * the width.
 */
function Section({ id, title, eyebrow, children, className = '' }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`py-12 sm:py-14 ${className}`}>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-700">{eyebrow}</p>
      ) : null}
      <h2
        id={`${id}-heading`}
        className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
      >
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Prose({ children }) {
  return <p className="measure text-base leading-relaxed text-navy-700">{children}</p>;
}

function Bullets({ items, tone = 'check' }) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-navy-700">
          <span
            className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${
              tone === 'check' ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-100 text-navy-500'
            }`}
            aria-hidden="true"
          >
            <Icon name={tone === 'check' ? 'check' : 'minus'} className="h-3 w-3" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Route shell.
 *
 * When the slug matches no trip this renders `NotFoundPage` and nothing else,
 * so the 404 owns the document head: `noindex,follow`, no canonical, its own
 * title and description. It used to be a child of a component that also called
 * `useSeo`; React flushes child effects before parent effects, so the parent
 * ran last and deleted the 404's robots tag. Every `/trips/<anything>` was
 * then indexable while carrying the site's default marketing description — an
 * unbounded set of soft-404s.
 */
export default function TripDetailPage() {
  const { slug } = useParams();
  const trip = findShowcaseTrip(slug);

  if (!trip) return <NotFoundPage />;
  return <TripView trip={trip} />;
}

function TripView({ trip }) {
  // Withdrawn while the itineraries are showcase content: a self-referential
// canonical next to `noindex,follow` claims an indexable identity this page
// does not have. Restored automatically when `IS_SHOWCASE` flips.
const canonical = IS_SHOWCASE ? null : joinUrl(SITE_URL, PATHS.trips, trip.slug);
  const heroImage = HERO_IMAGES[trip.slug];
  const route = trip.route ?? [];

  const structuredData = useMemo(() => {
    /**
     * The breadcrumb is NOT gated. A `BreadcrumbList` only states where this
     * URL sits in the site's hierarchy — Home → Trips → this trip — which is
     * true whether or not the trip is bookable, and matches the breadcrumb
     * rendered in the hero. Suppressing it alongside the `TouristTrip` would
     * have thrown away the one structured-data claim on the page that the
     * showcase notice does not contradict.
     */
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Journeys', item: joinUrl(SITE_URL, PATHS.trips) },
        // A `null` item would be invalid JSON-LD, so the breadcrumb names the
        // final step without a URL when the canonical is withdrawn. The
        // position claim is what a breadcrumb communicates, and that is still
        // true on a `noindex` page.
        {
          '@type': 'ListItem',
          position: 3,
          name: trip.title,
          ...(canonical ? { item: canonical } : {}),
        },
      ],
    };

    /**
     * Showcase journeys are NOT live TripTemplate inventory — no price, date
     * or availability may be asserted (PRD §173 requires UI, metadata and
     * agent representations to agree). A `TouristTrip` node is a
     * machine-readable claim that SafarUp operates a bookable trip with this
     * itinerary, and it is a *stronger* claim than the visible notice, which a
     * crawler and an answer engine never see. So while `IS_SHOWCASE` is true,
     * the node is suppressed entirely rather than shipped with a caveat
     * attached.
     *
     * Flip `IS_SHOWCASE` in `data/showcase.js` to false when the TripTemplate
     * API lands and the page becomes indexable again with its entity markup.
     */
    if (IS_SHOWCASE) return [breadcrumb];

    return [
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        '@id': canonical,
        name: trip.title,
        description: trip.summary,
        url: canonical,
        // `touristType` describes the KIND of traveller ("Families",
        // "Backpackers"), never the group size, so it is intentionally absent.
        // Group size is surfaced as `groupSize`-shaped copy in the UI, not as
        // a property that mislabels the entity.
        //
        // `itinerary` is an ordered ItemList of the real places this trip
        // covers — each a `Place`. It is not a list of days: typing a day as
        // `TouristAttraction` invents an attraction that does not exist.
        //
        // Derived from `tripLocationClusters`, NOT from `placesCovered`. Those
        // two are not the same list: `placesCovered` is a hand-picked summary
        // that includes journey waypoints and omits several real stops, so
        // using it here made the structured data claim 6 places while the page
        // visibly listed 10. One journey, one source of truth for its stops.
        itinerary: {
          '@type': 'ItemList',
          numberOfItems: tripPlaceCount(trip),
          itemListElement: tripLocationClusters(trip)
            .flatMap((cluster) => cluster.places)
            .map((place, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: { '@type': 'Place', name: place.name },
            })),
        },
        // A single day of a multi-day trip is a `subTrip` — the only correct
        // schema.org shape for "part of this trip". The `subTrip` property
        // itself is the parent/child link, so no back-reference is needed.
        subTrip: trip.itinerary.map((day) => ({
          '@type': 'TouristTrip',
          name: `Day ${day.day}: ${day.title}`,
          description: day.summary,
        })),
        // The `@id` comes from the shared constant so this can never drift from the
        // node `/` and `/about` define. Properties are inlined rather than
        // referenced: a bare `{"@id": ...}` pointing at another page's node is
        // a dangling reference in a single-node payload.
        provider: {
          '@type': 'Organization',
          '@id': ORGANIZATION_ID,
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
      breadcrumb,
    ];
  }, [trip, canonical]);

  useSeo({
    title: trip.title,
    description: trip.summary,
    canonical,
    // Absolute, and the real image for this trip rather than the site default.
    image: heroImage,
    robots: IS_SHOWCASE ? 'noindex,follow' : null,
    structuredData,
  });

  // Every one of these is derived, never hand-typed.
  const facts = tripFacts(trip);
  const clusters = tripLocationClusters(trip);
  const placeCount = tripPlaceCount(trip);

  /**
   * `placesCovered` carries a category per place; the location clusters carry
   * the grouping and the descriptions. Joining the two BY NAME lets each place
   * keep its category without a second hand-written list, and a stop with no
   * matching entry simply shows no category rather than an invented one.
   */
  const categoryByPlace = useMemo(
    () => new Map((trip.placesCovered ?? []).map((place) => [place.name, place.category])),
    [trip]
  );

  const railSummary = [
    ['District', trip.district],
    ['Duration', trip.duration],
    // Counted from the itinerary, not `trip.nights ?? 0`: that spelling printed
    // a confident "0" for a journey whose nights were unknown, while
    // `tripFacts` correctly omits the row. One fact, one source.
    ['Overnights', tripNights(trip) === 0 ? 'None' : String(tripNights(trip))],
    ['Places', `${placeCount}`],
    ['Group', trip.groupSize],
  ];

  return (
    // `pb-40 sm:pb-8` is the `StickyActionBar` contract: reserve the height of
    // the sticky conversion bar on the widths where it renders, and release it
    // where it does not. Same idiom as `DestinationDetailPage.jsx`.
    <article className="pb-40 sm:pb-8">
      {/* Hero. The route sits IN the image, above the fold, so the page states
          what kind of thing it is before a single word of the itinerary. */}
      <section className="on-dark relative isolate overflow-hidden bg-navy-950">
        {heroImage ? (
          <>
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-45"
              fetchpriority="high"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/75 to-navy-950/35"
            />
          </>
        ) : null}

        <div className="relative mx-auto max-w-shell px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
          {/*
            `<nav><ol><li>` — the shape the JSON-LD `BreadcrumbList` describes
            and the shape every other page uses. A bare `<nav>` holding a link
            and a text node is a list to a screen reader, not a breadcrumb.
          */}
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to={PATHS.home} className="rounded hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={PATHS.trips} className="rounded hover:text-white">
                  Journeys
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white" aria-current="page">
                {trip.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {/*
              The showcase marker travels with the title, not just with a
              banner further down the page.

              `accent-300`, a genuinely amber fill, rather than a second
              `accent-700` block: DESIGN_SYSTEM §13 allows orange at ONE focal
              point per screen, and on this screen that focal point is the
              "Request this trip" CTA directly below. Dark navy on light amber
              is 9.4:1, so the pill is legible without competing.
            */}
            {IS_SHOWCASE ? (
              <span className="rounded-full bg-accent-300 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-navy-950">
                Showcase
              </span>
            ) : null}
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
              {trip.duration}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
              {trip.season}
            </span>
            {trip.tripType ? (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                {trip.tripType}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            {trip.title}
          </h1>
          <p className="measure mt-4 text-lg leading-relaxed text-white/85">{trip.subtitle}</p>

          {/* The journey's spine, on the photograph. `tone="dark"` so the
              markers and labels read against the image. */}
          <div className="mt-7">
            <RouteLine route={route} size="md" tone="dark" />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button as="link" to={PATHS.planTrip} size="lg">
              Request this trip
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            {/*
              There is no enquiry endpoint, inbox or contact address wired up
              yet, so the only honest destination for a question is the private
              trip enquiry itself, where it is written down rather than sent
              into a void. Inventing a `mailto:` or a `/contact` route that
              404s would be worse than a second, clearly-labelled path to the
              same honest form.
            */}
            <Button
              as="link"
              to={PATHS.planTrip}
              size="lg"
              variant="onDark"
            >
              Ask a question
            </Button>
          </div>
        </div>

        {/* Honest demo-data notice — never implies live inventory. */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-shell items-start gap-3 px-4 py-5 sm:px-6 lg:px-8">
            <Icon name="info" className="mt-0.5 h-5 w-5 flex-none text-accent-300" />
            <p className="text-sm leading-relaxed text-white/75">
              <strong className="font-semibold text-white">{SHOWCASE_NOTICE.title}.</strong>{' '}
              {SHOWCASE_NOTICE.body}
            </p>
          </div>
        </div>
      </section>

      {/* Quick facts — derived from the journey itself. */}
      <section aria-label="Quick facts" className="border-b border-navy-100 bg-white">
        <div className="mx-auto grid max-w-shell gap-px bg-navy-100 px-0 sm:grid-cols-2 sm:px-4 md:grid-cols-3 lg:px-8">
          {facts.map((fact) => (
            <div key={fact.key} className="bg-white px-4 py-5">
              <div className="flex items-center gap-2 text-navy-500">
                <Icon name={FACT_ICONS[fact.key] ?? 'compass'} className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">{fact.label}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-navy-900">{fact.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey at a glance — its own band, immediately after the hero. This
          is the SHAPE of the journey: where it starts, where it sleeps, where
          it returns, and how many places each location holds. The itinerary
          below is the depth; this is the answer to "is this even for me?". */}
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8">
        <JourneyAtAGlance trip={trip} />
      </div>

      {/*
        Real internal link to the published destination this trip belongs to.

        Rendered ONLY when `destinationSlug` is set, which `data/showcase.js`
        guarantees is a destination the live API actually serves. A trip whose
        district has no published destination gets nothing here: a link to a
        slug that 404s is worse than no link, because it spends crawl budget
        and tells a crawler the site links to pages it has not published.
      */}
      {trip.destinationSlug ? (
        <div className="mx-auto max-w-shell px-4 pb-10 sm:px-6 lg:px-8">
          <Card
            as="link"
            to={destinationPath(trip.destinationSlug)}
            hover
            className="flex items-center gap-4"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <Icon name="mapPin" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-navy-500">
                Destination
              </span>
              <span className="mt-0.5 block text-base font-bold text-navy-900">
                {trip.destinationName} on SafarUp
              </span>
              <span className="mt-0.5 block text-sm leading-relaxed text-navy-600">
                Places to visit, how to reach it, and the private-trip enquiry for this destination.
              </span>
            </span>
            <Icon name="arrowRight" className="ml-auto h-5 w-5 flex-none text-brand-600" />
          </Card>
        </div>
      ) : null}

      {/* Main + rail */}
      <div className="mx-auto grid max-w-shell gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:px-8">
        <div className="min-w-0">
          <Section id="overview" title="Overview" eyebrow="The journey">
            <Prose>{trip.overview}</Prose>

            <h3 className="mt-8 text-base font-bold text-navy-900">Journey highlights</h3>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {trip.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-start gap-2.5 rounded-xl bg-navy-50/70 p-3 text-sm leading-relaxed text-navy-700"
                >
                  <Icon name="star" className="mt-0.5 h-4 w-4 flex-none text-accent-700" />
                  {highlight}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="pickup" title="Pickup & drop" eyebrow="Logistics" className="border-t border-navy-100">
            <div className="grid gap-5 sm:grid-cols-2">
              <Card variant="outline">
                <h3 className="text-sm font-bold text-navy-900">Pickup</h3>
                <ul className="mt-2.5 space-y-1.5 text-sm text-navy-700">
                  {trip.pickupDrop.pickupLocations.map((location) => (
                    <li key={location} className="flex items-center gap-2">
                      <Icon name="mapPin" className="h-4 w-4 flex-none text-accent-700" />
                      {location}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  {trip.pickupDrop.pickupInstructions}
                </p>
              </Card>
              <Card variant="outline">
                <h3 className="text-sm font-bold text-navy-900">Drop</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-navy-700">
                  {trip.pickupDrop.dropInstructions}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  {trip.pickupDrop.coordinationNotes}
                </p>
              </Card>
            </div>
          </Section>

          {/* The centrepiece. One continuous rail, collapsible days, and
              explicit Overnight and Return rows. */}
          <Section
            id="itinerary"
            title="Day-by-day itinerary"
            eyebrow="What happens, day by day"
            className="border-t border-navy-100"
          >
            <p className="measure mb-6 text-sm leading-relaxed text-navy-600">
              Every stop on this journey, in the order it happens. Each day names where you start,
              where you finish and where you sleep.
            </p>
            <ItineraryTimeline trip={trip} />
          </Section>

          {/*
            Places covered, grouped BY LOCATION rather than by category.

            A journey is a route, so the question is not "how many heritage
            places" but "how many places do I actually see in Rajgir, and on
            which day". `tripLocationClusters` derives exactly that from the
            day's own `startLocation`, so the count under each heading is the
            count the itinerary above prints.
          */}
          <Section id="places" title="Places covered" eyebrow="On the route" className="border-t border-navy-100">
            <div className="grid gap-5 sm:grid-cols-2">
              {clusters.map((cluster) => {
                const leg = route.find((entry) => entry.name === cluster.location);
                return (
                  <Card key={cluster.location} variant="outline">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold tracking-tight text-navy-900">
                        {cluster.location}
                      </h3>
                      {leg?.role === 'overnight' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">
                          <Icon name="home" className="h-3.5 w-3.5" />
                          Overnight
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-navy-700">
                      {cluster.placeCount} {cluster.placeCount === 1 ? 'place' : 'places'} · Day{' '}
                      {cluster.days.join(' and ')}
                    </p>

                    <ul className="mt-4 space-y-3">
                      {cluster.places.map((place) => (
                        <li key={place.name} className="flex items-start gap-2.5 text-sm">
                          <Icon name="mapPin" className="mt-0.5 h-4 w-4 flex-none text-accent-700" />
                          <span className="min-w-0">
                            <span className="font-semibold text-navy-900">{place.name}</span>
                            {categoryByPlace.get(place.name) ? (
                              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
                                {categoryByPlace.get(place.name)}
                              </span>
                            ) : null}
                            {place.description ? (
                              <span className="mt-0.5 block leading-relaxed text-navy-600">
                                {place.description}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-navy-500">
              {placeCount} places across {clusters.length}{' '}
              {clusters.length === 1 ? 'location' : 'locations'}, counted from the day plan printed
              above. Entry fees and donations are not included — see what is not included below.
            </p>
          </Section>

          <Section
            id="context"
            title={trip.historicalContext.heading}
            eyebrow="Background"
            className="border-t border-navy-100"
          >
            <Prose>{trip.historicalContext.body}</Prose>
          </Section>

          <Section id="stay" title="Accommodation" eyebrow="Where you sleep" className="border-t border-navy-100">
            <Card variant="outline">
              <div className="flex items-center gap-2.5">
                <Icon name="home" className="h-5 w-5 flex-none text-accent-700" />
                <p className="text-sm font-semibold text-navy-900">
                  {trip.nights === 0
                    ? 'No overnight on this journey.'
                    : `${trip.nights} night${trip.nights === 1 ? '' : 's'} on this route.`}
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-navy-700">{trip.accommodation.policy}</p>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">{trip.accommodation.criteria}</p>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{trip.accommodation.groupNote}</p>
            </Card>
          </Section>

          <Section id="food" title="Meals" eyebrow="Food" className="border-t border-navy-100">
            <div className="grid gap-4 sm:grid-cols-2">
              {trip.itinerary.map((day) => (
                <Card key={day.day} variant="outline">
                  <h3 className="text-sm font-bold text-navy-900">Day {day.day}</h3>
                  <ul className="mt-2.5 space-y-1.5 text-sm text-navy-700">
                    {day.meals.map((meal) => (
                      <li key={meal} className="flex items-center gap-2">
                        <Icon name="check" className="h-4 w-4 flex-none text-emerald-600" />
                        {meal}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </Section>

          <Section id="vehicle" title="Vehicle" eyebrow="Travel" className="border-t border-navy-100">
            <Card variant="outline">
              <p className="text-sm font-semibold text-navy-900">{trip.vehicle.policy}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trip.vehicle.possibilities.map((vehicle) => (
                  <span
                    key={vehicle}
                    className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700"
                  >
                    {vehicle}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-navy-600">{trip.vehicle.comfortNote}</p>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{trip.vehicle.routeNote}</p>
            </Card>
          </Section>

          <Section id="included" title="What's included" eyebrow="Inclusions" className="border-t border-navy-100">
            <Bullets items={trip.inclusions} />
          </Section>

          <Section id="excluded" title="What's not included" eyebrow="Exclusions" className="border-t border-navy-100">
            <Bullets items={trip.exclusions} tone="minus" />
          </Section>

          <Section id="best-time" title="Best time to travel" eyebrow="Seasonality" className="border-t border-navy-100">
            <Prose>{trip.bestTimeToTravel}</Prose>
          </Section>

          <Section
            id="important"
            title="Important information"
            eyebrow="Before you go"
            className="border-t border-navy-100"
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              {trip.importantInformation.map((item) => (
                // `Card` renders a `<div>`, and a `<div>` is the one element
                // HTML allows to group `dt`/`dd` inside a `<dl>`. It must not
                // be an `<li>` here — that needs a `<ul>` parent.
                <Card key={item.label} variant="outline">
                  <dt className="text-sm font-bold text-navy-900">{item.label}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-navy-600">{item.body}</dd>
                </Card>
              ))}
            </dl>
          </Section>
        </div>

        {/* Rail — desktop sticky; mobile gets the sticky action bar instead. */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {/* `surface`, not `outline`: this is the one raised panel in the
                rail, so it reads as the primary action block. */}
            <Card pad="lg" hover>
              <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Your route</p>
              <div className="mt-3">
                <RouteLine route={route} size="sm" />
              </div>
              <p className="mt-4 text-sm font-semibold text-navy-900">{tripRouteSummary(trip)}</p>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">
                There are no fixed departures for this journey yet — no dates, no seats and no price
                to look at. SafarUp runs it as a private trip built around the days you can travel.
              </p>
              <div className="mt-5 space-y-2.5">
                <Button as="link" to={PATHS.planTrip} className="w-full justify-center">
                  Request this trip
                  <Icon name="arrowRight" className="h-4 w-4" />
                </Button>
                <Button
                  as="link"
                  to={PATHS.destinations}
                  variant="secondary"
                  className="w-full justify-center"
                >
                  Browse destinations
                </Button>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-navy-500">
                <Icon name="info" className="mt-0.5 h-4 w-4 flex-none" />
                <span>No payment is taken at this stage. This is an enquiry.</span>
              </p>
            </Card>

            <div className="rounded-2xl bg-navy-50/70 p-5">
              <h2 className="text-sm font-bold text-navy-900">Journey summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {railSummary
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-navy-500">{label}</dt>
                      <dd className="text-right font-semibold text-navy-900">{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        </aside>
      </div>

      {/* Final CTA */}
      <section className="on-dark bg-navy-900 py-16">
        <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Travel {trip.district} on your own dates
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              Tell us your dates and how many are travelling. We will put together a private version
              of this route and send you a proposal you can change before you accept it. No payment
              is taken at this stage.
            </p>
          </div>
          <Button as="link" to={PATHS.planTrip} size="lg">
            Plan a Private Trip
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/*
        Sticky conversion action, above the bottom navigation and never on top
        of it (DESIGN_SYSTEM §5, PRD §195.2). The rail above is `hidden lg:block`
        and this bar is `sm:hidden`, so the two hand over at the same `lg`
        boundary the global nav does — there is never a width with no visible
        request action, however long the page is.
      */}
      <StickyActionBar
        to={PATHS.planTrip}
        label="Request this trip"
        hint="No fixed departures yet — ask us to build one."
      />
    </article>
  );
}
