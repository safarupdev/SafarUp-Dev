/**
 * Destination detail — PRD §22, §17 (`/destinations/:slug`),
 * DESTINATION.domain.contract.md §6.
 *
 * Sections render in the contract's order, and each one renders from a field
 * that exists today:
 *
 *   Overview ................ description
 *   Highlights .............. highlights[]
 *   Places to visit ........ places[]  (as references, never as copies)
 *   Things to do ............ NOT RENDERED — see below
 *   Travel information ..... travelInformation{}
 *   Upcoming SafarUp trips .. §112 empty state — no `tripTemplates` entity
 *   Private trip CTA ........ static, always present (§2.3)
 *   Blog articles ........... honest empty state — no `blogPosts` entity
 *
 * "Things to do" is deliberately absent. Its structure is an unresolved
 * decision (PRD §200.8) and the API deliberately does not return it
 * (backend/src/services/destination.service.js omits `thingsToDo` from the
 * public projection). Rendering a heading with invented content, or a
 * fabricated list, would be worse than the section being absent — the PRD
 * requires the section, the open decision forbids implementing it, and the
 * honest resolution is to build neither the data nor the heading.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { formatDateOrEmpty, isAbsoluteUrl, joinUrl, toIsoString } from '../lib/format';
import { isNotFound } from '../lib/apiClient';
import { SITE_URL } from '../constants/site';
import { PATHS, destinationPath, destinationsPath, placePath } from '../constants/routes';
import { fetchDestinationBySlug } from '../api/destinations.api';

import SmartImage from '../components/common/SmartImage';
import Icon from '../components/common/Icon';
import Button from '../components/common/Button';
import Chip from '../components/common/Chip';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import StickyActionBar from '../components/layout/StickyActionBar';

/** Shared field ordering and glyphs for the Travel information list. */
const TRAVEL_FIELDS = [
  { key: 'bestTimeToVisit', label: 'Best time to visit', icon: 'sun' },
  { key: 'howToReach', label: 'How to reach', icon: 'route' },
  { key: 'nearestRailway', label: 'Nearest railway station', icon: 'train' },
  { key: 'nearestAirport', label: 'Nearest airport', icon: 'plane' },
  { key: 'localLanguage', label: 'Local language', icon: 'globe' },
];

function Section({ title, id, children, description }) {
  return (
    <section aria-labelledby={id} className="border-t border-navy-100 py-10 first:border-t-0 first:pt-0">
      <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-navy-900">
        {title}
      </h2>
      {description ? <p className="mt-2 max-w-prose text-sm text-navy-500">{description}</p> : null}
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
    if (!destination) {
      return {
        title: 'Destination not found',
        description: 'This destination is not available on SafarUp.',
        canonical: null,
        robots: 'noindex,follow',
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
      type: 'article',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'TouristDestination',
          '@id': canonical,
          name: destination.name,
          description: destination.seo?.description || destination.shortDescription,
          url: canonical,
          image: destination.seo?.ogImage || destination.heroImage || undefined,
          // Places are referenced, never copied: `includesAttraction` points at
          // the canonical place identity (PRD §173, §186).
          includesAttraction: (destination.places ?? []).map((place) => ({
            '@type': 'Place',
            name: place.name,
            url: joinUrl(SITE_URL, placePath(place.slug)),
          })),
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
  }, [destination]);

  useSeo(seo);

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-400 ring-1 ring-navy-100">
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

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {categoryList.map((category) => (
                <Chip key={category.id} as="link" to={destinationsPath({ category: category.slug })}>
                  {category.name}
                </Chip>
              ))}
              {destination.featured ? (
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent-500 px-3.5 py-1.5 text-sm font-semibold text-white">
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
                      <Icon name="landmark" className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {placeList.length > 0 ? (
              <Section title="Places to visit" id="places-to-visit">
                <ul className="flex flex-wrap gap-2">
                  {placeList.map((place) => (
                    <li key={place.id}>
                      <Chip as="link" to={placePath(place.slug)}>
                        <Icon name="mapPin" className="h-4 w-4 text-navy-400" />
                        {place.name}
                      </Chip>
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
              Upcoming SafarUp trips — PRD §112 empty state.
              `GET /api/destinations/:slug/trips` is Phase 3: the `tripTemplates`
              entity is not contracted, so the API has nothing to return. A
              missing entity is an empty state, never an error and never a
              fabricated result (API.destination.contract.md §2.3).
            */}
            <Section title="Upcoming SafarUp trips" id="upcoming-trips">
              <EmptyState
                icon="route"
                title="No trips are scheduled for this destination yet."
                description="When SafarUp schedules a departure here, it will appear on this page — or ask us to build one around you."
                action="Plan a Private Trip"
                actionTo={PATHS.planTrip}
              />
            </Section>

            {/*
              Private trip CTA — static, always present, links to /plan-trip
              (API.destination.contract.md §2.3).
            */}
            <Section title="Plan a private trip to this destination" id="private-trip">
              <div className="overflow-hidden rounded-2xl bg-navy-900 px-6 py-8 sm:px-10 sm:py-10">
                <p className="measure text-lg leading-relaxed text-white/90">
                  Tell us your dates, who is travelling and what you want out of{' '}
                  {district ? `${district.name} — ` : ''}
                  {name}. Our team builds the itinerary, accommodation and transport, and sends it
                  back as a proposal you can accept or change.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button as="link" to={PATHS.planTrip} size="lg">
                    Plan a Private Trip
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Button>
                  <Button
                    as="link"
                    to={PATHS.destinations}
                    variant="secondary"
                    size="lg"
                    className="bg-transparent text-white ring-white/30 hover:bg-white/10"
                  >
                    Keep exploring
                  </Button>
                </div>
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
                    className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-brand-700 hover:text-brand-600"
                  >
                    All destinations in {district.name}
                    <Icon name="arrowRight" className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              ) : null}

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
      */}
      <StickyActionBar
        to={PATHS.planTrip}
        label="Plan a Private Trip"
        hint={district ? `Ready to travel to ${district.name}?` : 'Ready to travel?'}
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
