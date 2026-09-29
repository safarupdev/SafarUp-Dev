/**
 * Trip Detail — the structured travel-product experience (PRD §185–§194).
 *
 * This is the showcase centrepiece. The section order is the approved
 * architecture, not a layout invention:
 *
 *   hero → identity → quick facts → overview → pickup/drop → day-wise
 *   itinerary → places covered → historical/cultural context → inclusions →
 *   exclusions → vehicle → accommodation → meals → best time → important
 *   information → booking CTA
 *
 * Demo data notice: trips are not bookable yet (`data/showcase.js`). The page
 * says so plainly rather than implying inventory.
 */

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from '../constants/site';
import { PATHS, destinationPath } from '../constants/routes';
import {
  CATEGORY_ORDER,
  HERO_IMAGES,
  IS_SHOWCASE,
  SHOWCASE_NOTICE,
  findShowcaseTrip,
} from '../data/showcase';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Icon from '../components/common/Icon';
import NotFoundPage from './NotFoundPage';

/** Highlights → quick facts strip. */
const QUICK_FACTS = [
  { key: 'duration', label: 'Duration', icon: 'clock' },
  { key: 'season', label: 'Season', icon: 'sun' },
  { key: 'district', label: 'District', icon: 'mapPin' },
  { key: 'groupSize', label: 'Group size', icon: 'users' },
];

function Section({ id, title, eyebrow, children, className = '' }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`py-12 sm:py-14 ${className}`}>
      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-600">{eyebrow}</p>
        ) : null}
        <h2
          id={`${id}-heading`}
          className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
        >
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </div>
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
  const canonical = joinUrl(SITE_URL, PATHS.trips, trip.slug);

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
        { '@type': 'ListItem', position: 2, name: 'Trips', item: joinUrl(SITE_URL, PATHS.trips) },
        { '@type': 'ListItem', position: 3, name: trip.title, item: canonical },
      ],
    };

    /**
     * Showcase trips are NOT live TripTemplate inventory — no price, date or
     * availability may be asserted (PRD §173 requires UI, metadata and agent
     * representations to agree). A `TouristTrip` node is a machine-readable
     * claim that SafarUp operates a bookable trip with this itinerary, and it
     * is a *stronger* claim than the visible notice, which a crawler and an
     * answer engine never see. So while `IS_SHOWCASE` is true, the node is
     * suppressed entirely rather than shipped with a caveat attached.
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
        itinerary: {
          '@type': 'ItemList',
          numberOfItems: trip.placesCovered.length,
          itemListElement: trip.placesCovered.map((place, index) => ({
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
    image: HERO_IMAGES[trip.slug],
    robots: IS_SHOWCASE ? 'noindex,follow' : null,
    structuredData,
  });

  const heroImage = HERO_IMAGES[trip.slug];
  const placesByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    places: trip.placesCovered.filter((place) => place.category === category),
  })).filter((group) => group.places.length > 0);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy-950">
        {heroImage ? (
          <>
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-45"
              fetchPriority="high"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-950/30" />
          </>
        ) : null}
        <div className="relative mx-auto max-w-shell px-4 pb-14 pt-20 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
          {/*
            `<nav><ol><li>` — the shape the JSON-LD `BreadcrumbList` describes
            and the shape every other page uses. A bare `<nav>` holding a link
            and a text node is a list to a screen reader, not a breadcrumb.
          */}
          <nav aria-label="Breadcrumb" className="mb-5 text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to={PATHS.home} className="rounded hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={PATHS.trips} className="rounded hover:text-white">
                  Trips
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white" aria-current="page">
                {trip.title}
              </li>
            </ol>
          </nav>

          <h1 className="max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            {trip.title}
          </h1>
          <p className="measure mt-4 text-lg leading-relaxed text-white/85">{trip.subtitle}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
              {trip.duration}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
              {trip.season}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
              {trip.tripType}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
              {trip.district}
            </span>
          </div>
        </div>
      </section>

      {/* Honest demo-data notice — never implies live inventory. */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-shell items-start gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Icon name="info" className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="font-semibold">{SHOWCASE_NOTICE.title}.</strong>{' '}
            {SHOWCASE_NOTICE.body}
          </p>
        </div>
      </div>

      {/* Quick facts */}
      <section aria-label="Quick facts" className="border-b border-navy-100 bg-white">
        <div className="mx-auto grid max-w-shell grid-cols-2 gap-px bg-navy-100 px-0 sm:px-4 md:grid-cols-4 lg:px-8">
          {QUICK_FACTS.map((fact) => (
            <div key={fact.key} className="bg-white px-4 py-5">
              <div className="flex items-center gap-2 text-navy-500">
                <Icon name={fact.icon} className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">{fact.label}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-navy-900">{trip[fact.key]}</p>
            </div>
          ))}
        </div>
      </section>

      {/*
        Real internal link to the published destination this trip belongs to.

        Rendered ONLY when `destinationSlug` is set, which `data/showcase.js`
        guarantees is a destination the live API actually serves. A trip whose
        district has no published destination gets nothing here: a link to a
        slug that 404s is worse than no link, because it spends crawl budget
        and tells a crawler the site links to pages it has not published.
      */}
      {trip.destinationSlug ? (
        <div className="mx-auto max-w-shell px-4 pt-8 sm:px-6 lg:px-8">
          <Card
            as="link"
            to={destinationPath(trip.destinationSlug)}
            hover
            className="flex items-center gap-4"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent-50 text-accent-600">
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

      {/* Main + booking rail */}
      <div className="mx-auto grid max-w-shell gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_20rem] lg:px-8">
        <div className="min-w-0">
          <Section id="overview" title="Overview" eyebrow="The trip">
            <div className="space-y-4">
              <Prose>{trip.overview}</Prose>
            </div>

            <h3 className="mt-8 text-base font-bold text-navy-900">Trip highlights</h3>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {trip.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-start gap-2.5 rounded-xl bg-navy-50/70 p-3 text-sm leading-relaxed text-navy-700"
                >
                  <Icon name="star" className="mt-0.5 h-4 w-4 flex-none text-accent-500" />
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
                      <Icon name="mapPin" className="h-4 w-4 flex-none text-accent-500" />
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

          <Section id="itinerary" title="Day-wise itinerary" eyebrow="What happens" className="border-t border-navy-100">
            <ol className="space-y-8">
              {trip.itinerary.map((day) => (
                <li key={day.day} className="relative pl-9 sm:pl-11">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white"
                  >
                    {day.day}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute left-4 top-9 bottom-0 w-px bg-navy-100 sm:left-[1.3125rem]"
                  />
                  <h3 className="text-lg font-bold text-navy-900">Day {day.day} — {day.title}</h3>
                  <p className="mt-1.5 measure text-sm leading-relaxed text-navy-600">{day.summary}</p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-navy-50 px-2.5 py-1 font-semibold text-navy-700">
                      {day.startLocation} → {day.endLocation}
                    </span>
                    {day.meals.map((meal) => (
                      <span key={meal} className="rounded-full bg-accent-50 px-2.5 py-1 font-semibold text-accent-700">
                        {meal}
                      </span>
                    ))}
                    {day.overnight ? (
                      <span className="rounded-full bg-navy-900 px-2.5 py-1 font-semibold text-white">
                        Overnight
                      </span>
                    ) : null}
                  </div>

                  <ol className="mt-4 space-y-2.5">
                    {day.stops.map((stop) => (
                      <li key={stop.name} className="flex gap-3 text-sm">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-accent-500"
                        />
                        <span>
                          <span className="font-semibold text-navy-900">{stop.name}</span>
                          {stop.description ? (
                            <span className="text-navy-600"> — {stop.description}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="places" title="Places covered" eyebrow="On the route" className="border-t border-navy-100">
            <div className="grid gap-5 sm:grid-cols-2">
              {placesByCategory.map((group) => (
                <Card key={group.category} variant="outline">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-500">
                    {group.category}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {group.places.map((place) => (
                      <li key={place.name} className="flex items-start gap-2 text-sm text-navy-800">
                        <Icon name="mapPin" className="mt-0.5 h-4 w-4 flex-none text-accent-500" />
                        {place.name}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-sm text-navy-500">
              Places are SafarUp entities, so the same place appears consistently across trips and
              destinations.
            </p>
          </Section>

          <Section id="context" title={trip.historicalContext.heading} eyebrow="Background" className="border-t border-navy-100">
            <Prose>{trip.historicalContext.body}</Prose>
          </Section>

          <Section id="included" title="What's included" eyebrow="Inclusions" className="border-t border-navy-100">
            <Bullets items={trip.inclusions} />
          </Section>

          <Section id="excluded" title="What's not included" eyebrow="Exclusions" className="border-t border-navy-100">
            <Bullets items={trip.exclusions} tone="minus" />
          </Section>

          <Section id="vehicle" title="Vehicle" eyebrow="Travel" className="border-t border-navy-100">
            <Card variant="outline">
              <p className="text-sm font-semibold text-navy-900">{trip.vehicle.policy}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trip.vehicle.possibilities.map((vehicle) => (
                  <span key={vehicle} className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
                    {vehicle}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-navy-600">{trip.vehicle.comfortNote}</p>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{trip.vehicle.routeNote}</p>
            </Card>
          </Section>

          <Section id="stay" title="Accommodation" eyebrow="Where you sleep" className="border-t border-navy-100">
            <Card variant="outline">
              <p className="text-sm leading-relaxed text-navy-700">{trip.accommodation.policy}</p>
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

          <Section id="best-time" title="Best time to travel" eyebrow="Seasonality" className="border-t border-navy-100">
            <Prose>{trip.bestTimeToTravel}</Prose>
          </Section>

          <Section id="important" title="Important information" eyebrow="Before you go" className="border-t border-navy-100">
            <dl className="grid gap-4 sm:grid-cols-2">
              {trip.importantInformation.map((item) => (
                <Card key={item.label} variant="outline">
                  <dt className="text-sm font-bold text-navy-900">{item.label}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-navy-600">{item.body}</dd>
                </Card>
              ))}
            </dl>
          </Section>
        </div>

        {/* Booking rail — desktop sticky; mobile gets the sticky action bar. */}
        <aside className="hidden lg:block">
<div className="sticky top-24 space-y-4">
              {/* `surface`, not `outline`: this is the one raised panel in the
                  rail, so it reads as the primary action block. */}
              <Card pad="lg" hover>
                <p className="text-xs font-bold uppercase tracking-wider text-navy-500">
                  {trip.duration} · {trip.season}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  Departures, dates and prices are not published yet. A private trip built on this route
                  is available now.
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
              </Card>


            <div className="rounded-2xl bg-navy-50/70 p-5">
              <h3 className="text-sm font-bold text-navy-900">Trip summary</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ['District', trip.district],
                  ['Duration', trip.duration],
                  ['Group', trip.groupSize],
                  ['Overnights', String(trip.itinerary.filter((d) => d.overnight).length)],
                ].map(([label, value]) => (
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
      <section className="bg-navy-900 py-16">
        <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Experience {trip.district} differently with SafarUp
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              Tell us your dates and how many are travelling. We will put together a private version
              of this route and send you a proposal you can change before you accept it.
            </p>
          </div>
          <Button as="link" to={PATHS.planTrip} size="lg">
            Plan a Private Trip
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
