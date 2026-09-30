/**
 * Destination detail — PRD §22, §17 (`/destinations/:slug`),
 * DESTINATION.domain.contract.md §6.
 *
 * A destination is a DISCOVERY surface, not the product. The product is a
 * complete multi-day journey that starts somewhere, crosses at least one more
 * place, sleeps on the way and returns. So this page is written as the context
 * a journey is planned inside: what the place is, what is worth seeing, how to
 * reach it — and, explicitly, which journeys already route through
 * it.
 *
 * Sections render in the contract's order, and each one renders from a field
 * that exists today:
 *
 *   Overview ................ description
 *   Highlights .............. highlights[]
 *   Places to visit ........ places[]  (as references, never as copies)
 *   Things to do ............ NOT RENDERED — see below
 *   Travel information ..... travelInformation{}
 *   Journeys through here .. showcaseTripsForDestination(slug) — §112 empty state
 *   Journey enquiry CTA ..... static, always present (§2.3)
 *   Blog articles ........... honest empty state — no `blogPosts` entity
 *
 * "Things to do" is deliberately absent. Its structure is an unresolved
 * decision (PRD §200.8) and the API deliberately does not return it
 * (backend/src/services/destination.service.js omits `thingsToDo` from the
 * public projection). Rendering a heading with invented content, or a
 * fabricated list, would be worse than the section being absent — the PRD
 * requires the section, the open decision forbids implementing it, and the
 * honest resolution is to build neither the data nor the heading.
 *
 * THE ONE DIRECTION OF TRAVEL. A journey may point at a destination
 * (`destinationSlug` in `data/showcase.js`, verified against the live API);
 * a destination never points at a journey it was not named by. That is why the
 * journeys section below can legitimately be empty, and why it is left empty
 * rather than padded with a district match or a keyword match.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { formatDateOrEmpty, isAbsoluteUrl, joinUrl, toIsoString } from '../lib/format';
import { isNotFound } from '../lib/apiClient';
import { SITE_URL } from '../constants/site';
import { PATHS, destinationPath, destinationsPath } from '../constants/routes';
import { fetchDestinationBySlug } from '../api/destinations.api';
import { IS_SHOWCASE, SHOWCASE_NOTICE, showcaseTripsForDestination } from '../data/showcase';

import SmartImage from '../components/common/SmartImage';
import Icon from '../components/common/Icon';
import Button from '../components/common/Button';
import Chip from '../components/common/Chip';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import StickyActionBar from '../components/layout/StickyActionBar';
import TripCard from '../components/journey/TripCard';

/** Shared field ordering and glyphs for the Travel information list. */
const TRAVEL_FIELDS = [
  { key: 'bestTimeToVisit', label: 'Best time to visit', icon: 'sun' },
  { key: 'howToReach', label: 'How to reach', icon: 'route' },
  { key: 'nearestRailway', label: 'Nearest railway station', icon: 'train' },
  { key: 'nearestAirport', label: 'Nearest airport', icon: 'plane' },
  { key: 'localLanguage', label: 'Local language', icon: 'globe' },
];

/**
 * A place chip, which is NOT a link.
 *
 * `Chip` renders either a `<Link>` or a toggle `<button>`; a place is neither,
 * because whether a Place gets a public page at all is an unresolved decision
 * (PRD §200.6). Wiring these to `/places/:slug` would send a visitor to a
 * reserved route that renders a "not published yet" placeholder, and would
 * contradict the page's own structured data, which references places by name
 * only and deliberately asserts no `url` for them. So the chip is a plain
 * styled span: it reads as a place, and it does not pretend to be somewhere
 * you can go yet.
 */
const PLACE_CHIP =
  'inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3.5 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-inset ring-navy-200';

function Section({ title, id, children, description }) {
  return (
    <section aria-labelledby={id} className="border-t border-navy-100 py-10 first:border-t-0 first:pt-0">
      <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-navy-900">
        {title}
      </h2>
      {/* `.measure`, not the prose max-width utility. Both resolve to the
          same 68ch token today, so this is not a visual change — it is
          removing a second spelling for one idea before the two drift. (The
          class name is spelled out here rather than in the class string so
          Tailwind's scanner does not keep generating the other utility from
          this comment.) */}
      {description ? <p className="measure mt-2 text-sm text-navy-500">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function DestinationDetailPage() {
  const { slug } = useParams();

  const query = useQuery({
    queryKey: ['destination', slug],
    queryFn: () => fetchDestinationBySlug(slug),
  });

  const destination = query.data ?? null;
  const notFound = query.isError && isNotFound(query.error);

  const seo = useMemo(() => {
    /**
     * Only a genuine 404 may publish a not-found head.
     *
     * Keying this on `!destination` also caught the pending state and every
     * non-404 failure — a 500, a timeout, the API being down. That handed a
     * crawler `noindex,follow` plus a "Destination not found" title for a URL
     * that is in the sitemap and linked from `/destinations`, so one transient
     * backend error could deindex a real published page.
     *
     * While loading or temporarily failing, the page states its canonical and
     * stays indexable, and simply carries no entity structured data, because
     * there is nothing true to describe yet.
     */
    if (!destination) {
      if (notFound) {
        return {
          title: 'Destination not found',
          description: 'This destination is not available on SafarUp.',
          canonical: null,
          robots: 'noindex,follow',
        };
      }
      return {
        title: 'Destination',
        description: undefined,
        canonical: joinUrl(SITE_URL, destinationPath(slug)),
        robots: null,
        structuredData: [],
      };
    }

    const canonical = isAbsoluteUrl(destination.seo?.canonicalUrl)
      ? destination.seo.canonicalUrl
      : joinUrl(SITE_URL, destinationPath(destination.slug));

    const published = toIsoString(destination.publishedAt);
    const updated = toIsoString(destination.updatedAt);

    return {
      title: destination.seo?.title || destination.name,
      description: destination.seo?.description || destination.shortDescription,
      canonical,
      image: destination.seo?.ogImage || destination.heroImage,
      robots: null,
      type: 'website',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'TouristDestination',
          '@id': canonical,
          name: destination.name,
          description: destination.seo?.description || destination.shortDescription,
          url: canonical,
          image: destination.seo?.ogImage || destination.heroImage || undefined,
          /**
           * Places are referenced by NAME only. A `url` here would point at
           * `/places/:slug`, which has no public page yet — that route renders
           * an explicit `noindex,follow` "not available" state with no
           * canonical. Asserting a URL for an entity that must not be indexed
           * tells a crawler the identity exists and simultaneously that it
           * should be skipped, so it follows the link, lands on a placeholder
           * and burns crawl budget. PRD §200.6 has not settled whether a Place
           * gets a public page; until it does, no URL is invented for it.
           */
          includesAttraction: (destination.places ?? []).map((place) => ({
            '@type': 'Place',
            name: place.name,
          })),
          // District as a resolvable entity so "destinations in Nalanda" is a
          // navigable, canonical relationship rather than a dangling name.
          // District is named but not linked. `/destinations?district=x` is
          // itself `noindex,follow` (a filtered permutation), so a `url` here
          // would point a crawler at a page this file's own reasoning says must
          // not be treated as a canonical identity — the same reasoning that
          // strips `url` from Place nodes above.
          containedInPlace: destination.district
            ? {
                '@type': 'Place',
                name: destination.district.name,
              }
            : undefined,
          datePublished: published || undefined,
          dateModified: updated || undefined,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Destinations', item: joinUrl(SITE_URL, PATHS.destinations) },
            { '@type': 'ListItem', position: 3, name: destination.name, item: canonical },
          ],
        },
      ],
    };
  }, [destination, notFound, slug]);

  useSeo(seo);

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-500 ring-1 ring-navy-100">
          <Icon name="mapPin" className="h-7 w-7" />
        </span>
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            We could not find that destination
          </h1>
          <p className="text-base leading-relaxed text-navy-600">
            It may have been unpublished, or the address may have changed. Every destination SafarUp
            has published is listed in one place.
          </p>
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

  if (query.isPending) {
    return <DestinationDetailSkeleton />;
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <ErrorState error={query.error} onRetry={() => query.refetch()} title="We could not load this destination" />
      </div>
    );
  }

  if (!destination) {
    // A 200 with no payload would be a backend contract break. Say so plainly
    // rather than rendering an empty page that looks intentional.
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <ErrorState title="This destination could not be displayed" />
      </div>
    );
  }

  const { name, shortDescription, district, categories, places, highlights, travelInformation } =
    destination;
  const description = typeof destination.description === 'string' ? destination.description.trim() : '';
  const paragraphs = description ? description.split(/\n{2,}/).filter(Boolean) : [];
  const highlightList = Array.isArray(highlights) ? highlights : [];
  const placeList = Array.isArray(places) ? places : [];
  const categoryList = Array.isArray(categories) ? categories : [];

  const travelRows = TRAVEL_FIELDS.map(({ key, label, icon }) => ({
    label,
    icon,
    value: travelInformation?.[key],
  })).filter((row) => typeof row.value === 'string' && row.value.trim().length > 0);

  // The reverse of `data/showcase.js`'s one-way `destinationSlug` link. Exact
  // match only, and empty for most published destinations today — which is the
  // correct answer, not a gap to be filled with a district or keyword match.
  const linkedJourneys = showcaseTripsForDestination(destination.slug);

  const updatedLabel = formatDateOrEmpty(destination.updatedAt);
  const publishedLabel = formatDateOrEmpty(destination.publishedAt);

  return (
    <article className="pb-40 sm:pb-8">
      <header className="relative isolate bg-navy-950">
        {/* The image is in flow, so the header has its height before the bytes
            arrive; the overlay is absolutely positioned on top of it. */}
        <SmartImage
          src={destination.heroImage}
          alt={`${name}${district ? `, ${district.name}` : ''}`}
          ratio={null}
          priority
          sizes="100vw"
          className="h-72 w-full sm:h-96 lg:h-[30rem]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/55 to-navy-950/30"
        />

        <div className="absolute inset-0 mx-auto flex max-w-shell flex-col justify-between px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/85">
              <li>
                <Link to={PATHS.home} className="rounded hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={PATHS.destinations} className="rounded hover:text-white">
                  Destinations
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white" aria-current="page">
                {name}
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            {district ? (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent-300">
                <Icon name="mapPin" className="h-4 w-4" />
                {district.name} district
              </p>
            ) : null}

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              {name}
            </h1>
            <p className="measure mt-4 text-base leading-relaxed text-white/90 sm:text-lg">{shortDescription}</p>

            {/*
              The relationship, stated before anything else on the page.

              Without this, a destination page reads as a product: a place with
              a name, a description and a "plan it" button. What it actually is
              is a stop INSIDE a journey — what the traveller books is the
              whole route, start and overnight and return, and this page is the
              background research for that. Saying it once, here, is what makes
              the "Journeys through here" section below read as the main event
              rather than a footnote.
            */}
            <p className="mt-5 flex max-w-2xl items-start gap-2 text-sm leading-relaxed text-white/75">
              <Icon name="info" className="mt-0.5 h-4 w-4 flex-none text-accent-300" />
              <span>
                {name} is a stop within our journeys, not a trip on its own. What you travel is
                the whole route — where it starts, where it sleeps, and where it returns.
              </span>
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {categoryList.map((category) => (
                <Chip key={category.id} as="link" to={destinationsPath({ category: category.slug })}>
                  {category.name}
                </Chip>
              ))}
              {destination.featured ? (
                <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent-700 px-3.5 py-1.5 text-sm font-semibold text-white">
                  <Icon name="sparkle" className="h-4 w-4" />
                  Featured destination
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="min-w-0 py-10 sm:py-12">
            {paragraphs.length > 0 ? (
              <Section title="Overview" id="overview">
                <div className="measure space-y-4 text-[1.0625rem] leading-relaxed text-navy-700">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </Section>
            ) : null}

            {highlightList.length > 0 ? (
              <Section title="Highlights" id="highlights">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {highlightList.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex gap-3 rounded-xl bg-navy-50 px-4 py-3.5 text-[0.95rem] leading-relaxed text-navy-800"
                    >
                      <Icon name="landmark" className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {placeList.length > 0 ? (
              <Section
                title="Places to visit"
                id="places-to-visit"
                description="Individual places a journey could be built around, inside this destination. They are listed as names, not links — whether a place gets a page of its own is an open product decision (PRD §200.6), so none is invented here."
              >
                <ul className="flex flex-wrap gap-2">
                  {placeList.map((place) => (
                    <li key={place.id}>
                      {/* Non-linking by design — see PLACE_CHIP. */}
                      <span className={PLACE_CHIP}>
                        <Icon name="mapPin" className="h-4 w-4 text-navy-500" />
                        {place.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {travelRows.length > 0 ? (
              <Section title="Travel information" id="travel-information">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {travelRows.map((row) => (
                    <div key={row.label} className="rounded-xl bg-navy-50 px-4 py-3.5">
                      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-500">
                        <Icon name={row.icon} className="h-4 w-4" />
                        {row.label}
                      </dt>
                      <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-navy-800">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            ) : null}
            {/*
              Journeys through here.

              This is the section the page is actually for. A destination is a
              stop inside a journey, so the only honest question is "which
              journeys route through it?" — and
              `showcaseTripsForDestination()` answers exactly that, by exact
              `destinationSlug` match and nothing else. It is not a district
              match, a keyword match or a hand-written list, because each of
              those invents a trip↔destination relationship the data does not
              state: a journey that merely passes through Nalanda on its way
              to Rajgir is not a Nalanda journey.

              So the result is frequently empty, and the empty state below is
              the correct outcome rather than a gap to be padded. Each journey
              is rendered with the same `TripCard` used on Journeys and Home,
              so a journey looks the same wherever the visitor meets it — with
              its route line and its place count, because a card showing only
              a photo and a title is a destination card.
            */}
            <Section
              title="Journeys through here"
              id="journeys"
              description="A journey is listed here only when this destination is named on its own route. Destinations it passes through without claiming are not counted, and where no journey names this one, the list stays empty rather than being filled with a near miss."
            >
              {linkedJourneys.length > 0 ? (
                <>
                  <p className="mb-5 text-sm font-semibold text-navy-700">
                    {/*
                      "published" is a claim this indexable page cannot make
                      while the journeys are showcase content. Mirrors
                      `DestinationsPage`, which already gates the same fact on
                      `IS_SHOWCASE`.
                    */}
                    {linkedJourneys.length}{' '}
                    {IS_SHOWCASE ? 'example journey' : 'published journey'}
                    {linkedJourneys.length === 1 ? '' : 's'} routes
                    {linkedJourneys.length === 1 ? '' : 's'} through {name}.
                  </p>
                  <ul className="grid gap-6 sm:grid-cols-2">
                    {linkedJourneys.map((trip) => (
                      <li key={trip.slug}>
                        <TripCard trip={trip} />
                      </li>
                    ))}
                  </ul>
                  {IS_SHOWCASE ? (
                    <p className="mt-5 text-sm leading-relaxed text-navy-500">
                      {SHOWCASE_NOTICE.body}
                    </p>
                  ) : null}
                  <p className="mt-5">
                    <Link
                      to={PATHS.trips}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-brand-700 hover:text-brand-600"
                    >
                      Browse every SafarUp journey
                      <Icon name="arrowRight" className="h-4 w-4" />
                    </Link>
                  </p>
                </>
              ) : (
                <EmptyState
                  icon="compass"
                  title={`No SafarUp journey runs through ${name} yet.`}
                  description={`${name} is a destination we have written up, not one a SafarUp journey currently routes through. We only claim a journey here when the journey itself names this destination — browse the journeys we do publish, or tell us the route you want and we will build it.`}
                  action="Explore journeys"
                  actionTo={PATHS.trips}
                />
              )}
            </Section>

            {/*
              Journey CTA — static, always present, links to /plan-trip
              (API.destination.contract.md §2.3).

              Ordered deliberately: journeys FIRST, enquiry second. The visitor
              arrived here through discovery, and the destination is not
              something they book, so the lead action is to look at the
              journeys that exist. The enquiry stays on the page because most
              SafarUp journeys are private and built around someone's dates —
              but it is framed as a journey, not as booking a destination.
            */}
            <Section title="Travel through here on your own dates" id="private-trip">
              <div className="on-dark overflow-hidden rounded-2xl bg-navy-900 px-6 py-8 sm:px-10 sm:py-10">
                <p className="measure text-lg leading-relaxed text-white/90">
                  A SafarUp journey is the whole route, not a single stop. Tell us the district, the
                  dates, who is travelling and what you want out of {district ? `${district.name} — ` : ''}
                  {name} — our team plans the itinerary, the overnight stay and the transport, and
                  sends it back as a proposal you can change before you accept anything.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button as="link" to={PATHS.trips} size="lg">
                    Explore journeys
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Button>
                  <Button
                    as="link"
                    to={PATHS.planTrip}
                    variant="onDark"
                    size="lg"
                  >
                    Plan a Private Trip
                  </Button>
                </div>
                <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-white/70">
                  <Icon name="info" className="mt-0.5 h-4 w-4 flex-none" />
                  <span>
                    An enquiry, not a booking. There is no payment, no availability check and no
                    confirmation at this stage.
                  </span>
                </p>
              </div>
            </Section>

            {/*
              Blog articles — no `blogPosts` entity exists yet
              (API.destination.contract.md §2.3). PRD §112 defines empty states
              for trips, bookings and private requests but not for blog, so this
              copy is deliberately plain and says only that there is nothing
              here yet.
            */}
            <Section title="Blog articles" id="blog-articles">
              <EmptyState
                icon="inbox"
                title="No travel stories are published for this destination yet."
                description="Stories about the places, routes and seasons we travel will appear here."
                action="Browse travel stories"
                actionTo={PATHS.blog}
              />
            </Section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {district ? (
                <div className="rounded-2xl border border-navy-100 bg-navy-50/70 p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-navy-500">District</h2>
                  <p className="mt-2 flex items-center gap-2 text-base font-semibold text-navy-900">
                    <Icon name="mapPin" className="h-4 w-4 text-brand-600" />
                    {district.name}
                  </p>
                  <Link
                    to={destinationsPath({ district: district.slug })}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:text-brand-600"
                  >
                    All destinations in {district.name}
                    <Icon name="arrowRight" className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              ) : null}

              {/*
                Journeys, in the rail.

                The count is derived from the same exact-match lookup the main
                section uses, so the rail can never claim a journey the section
                does not show. The wording stays honest at zero — "no journey
                published yet", not a padded suggestion that one must exist.
              */}
              <div className="rounded-2xl border border-navy-100 bg-white p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-navy-500">
                  Journeys
                </h2>
                {linkedJourneys.length > 0 ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-navy-900">
                      {linkedJourneys.length}{' '}
                      {linkedJourneys.length === 1 ? 'journey' : 'journeys'} route
                      {linkedJourneys.length === 1 ? '' : 's'} through {name}.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {linkedJourneys.map((trip) => (
                        <li key={trip.slug} className="text-sm leading-relaxed text-navy-600">
                          {trip.title} — {trip.duration}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    No SafarUp journey runs through {name} yet.
                  </p>
                )}
                <Link
                  to={PATHS.trips}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:text-brand-600"
                >
                  Explore all journeys
                  <Icon name="arrowRight" className="ml-1.5 h-4 w-4" />
                </Link>
              </div>

              {publishedLabel || updatedLabel ? (
                <p className="text-xs leading-relaxed text-navy-500">
                  {publishedLabel ? (
                    <>
                      Published <time dateTime={toIsoString(destination.publishedAt) ?? undefined}>{publishedLabel}</time>
                    </>
                  ) : null}
                  {publishedLabel && updatedLabel ? ' · ' : null}
                  {updatedLabel ? (
                    <>
                      last updated{' '}
                      <time dateTime={toIsoString(destination.updatedAt) ?? undefined}>{updatedLabel}</time>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {/*
        Sticky conversion action, above the bottom navigation and never on top
        of it (DESIGN_SYSTEM.md §5, PRD §195.2).

        The hint says "through {district}" rather than "to {district}". The
        whole page is built on the distinction between a place and a journey,
        and the last thing a mobile visitor reads before the enquiry form
        should not quietly collapse the two back together.
      */}
      <StickyActionBar
        to={PATHS.planTrip}
        label="Plan a Private Trip"
        hint={
          district
            ? `Want a journey through ${district.name}? Tell us your dates.`
            : 'Want a journey through here? Tell us your dates.'
        }
      />
    </article>
  );
}

/** Skeleton with the same geometry as the loaded page — no layout shift. */
function DestinationDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading destination">
      <div className="skeleton aspect-[16/9] w-full sm:aspect-[21/9]" />
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8">
        <div className="skeleton h-3 w-56 rounded" />
        <div className="skeleton mt-5 h-10 w-3/5 rounded-lg" />
        <div className="skeleton mt-4 h-4 w-2/3 rounded" />
        <div className="mt-10 max-w-3xl space-y-3">
          <div className="skeleton h-7 w-40 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading destination
      </span>
    </div>
  );
}
