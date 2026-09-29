/**
 * Home — PRD §18, §17 (`/`).
 *
 * Every section here is a section PRD §18 names, and every piece of data on
 * the page comes from the live API. Nothing is invented: the sections that
 * depend on entities which do not exist yet (upcoming trips, testimonials,
 * travel stories) are omitted rather than filled with placeholder cards,
 * because a fabricated card is indistinguishable from a real one to a visitor.
 *
 * Section order: Hero · Popular Destinations · Why SafarUp · How it works ·
 * Final CTA.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_TAGLINE, SITE_URL, DEFAULT_DESCRIPTION, organizationNode, websiteNode } from '../constants/site';
import { PATHS } from '../constants/routes';
import { fetchDestinations } from '../api/destinations.api';

import DestinationCard from '../components/destination/DestinationCard';
import DestinationCardSkeleton from '../components/destination/DestinationCardSkeleton';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Icon from '../components/common/Icon';

const WHY_SAFARUP = [
  {
    icon: 'compass',
    title: 'Curated trips',
    body: 'Every departure is built by people who have travelled the route, not resold from a wholesale list.',
  },
  {
    icon: 'ticket',
    title: 'Transparent booking',
    body: 'What you see is what you pay. Prices, inclusions and availability are on the page before you commit.',
  },
  {
    icon: 'globe',
    title: 'Secure payment',
    body: 'Payments run through a regulated gateway. Card details never touch SafarUp servers.',
  },
  {
    icon: 'route',
    title: 'Private customisation',
    body: 'Change dates, hotels, transport and the plan itself — a private trip is built around you.',
  },
];

const HOW_IT_WORKS = [
  { step: 'Discover', body: 'Browse destinations by district and by what you actually want to do.' },
  { step: 'Choose', body: 'Pick a scheduled departure, or ask for a private trip built around you.' },
  { step: 'Book', body: 'Pay securely online. Your confirmation and documents live in one place.' },
  { step: 'Travel', body: 'Itinerary, pickup point and contacts on your phone, the whole way.' },
];

export default function HomePage() {
  const featuredQuery = useQuery({
    queryKey: ['destinations', { featured: true, home: true }],
    queryFn: () => fetchDestinations({ featured: true, limit: 6 }),
  });

  const featured = featuredQuery.data?.items ?? [];

  const structuredData = useMemo(() => [organizationNode(), websiteNode()], []);

  useSeo({
    title: null,
    description: DEFAULT_DESCRIPTION,
    canonical: joinUrl(SITE_URL, PATHS.home),
    structuredData,
  });
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(60rem 30rem at 15% -10%, rgba(249,115,22,0.28), transparent 60%), radial-gradient(50rem 30rem at 90% 10%, rgba(37,99,235,0.35), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-shell px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">SafarUp</p>
          {/*
            The h1 carries the topical claim, not the brand line. "Travel.
            Planned Better." is a slogan: it is identical on every page that
            prints it, describes no subject, and matches no query. The tagline
            still appears, immediately below the h1, as supporting copy.
          */}
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Curated group trips and private journeys across India
          </h1>
          <p className="measure mt-5 font-display text-xl font-bold tracking-tight text-accent-300 sm:text-2xl">
            {SITE_TAGLINE}
          </p>
          <p className="measure mt-4 text-lg leading-relaxed text-white/85">
            Planned by travellers, priced transparently, and managed from booking to departure —
            every itinerary, inclusion and availability shown before you commit.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button as="link" to={PATHS.destinations} size="lg">
              Explore destinations
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            <Button
              as="link"
              to={PATHS.planTrip}
              size="lg"
              variant="secondary"
              className="bg-transparent text-white ring-white/30 hover:bg-white/10"
            >
              Plan a Private Trip
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Destinations — PRD §18, driven by `?featured=true` (§2.1). */}
      <section aria-labelledby="popular-destinations" className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="popular-destinations"
              className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
            >
              Popular destinations
            </h2>
            <p className="mt-2 text-sm text-navy-600">
              Destinations our team travels to, and recommends first.
            </p>
          </div>
          <Linkish to={PATHS.destinations}>All destinations</Linkish>
        </div>

        <div className="mt-8">
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
      </section>

      <section aria-labelledby="why-safarup" className="bg-navy-50/70 py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <h2 id="why-safarup" className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Why SafarUp
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_SAFARUP.map((item) => (
              <Card as="li" key={item.title} pad="lg">
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

      <section aria-labelledby="how-it-works" className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8">
        <h2 id="how-it-works" className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, index) => (
            // `outline`: these sit on white, directly below the raised "Why
            // SafarUp" cards. Two shadows on the same screen compete.
            <Card as="li" key={item.step} variant="outline" pad="lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-base font-bold text-navy-900">{item.step}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{item.body}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section aria-labelledby="final-cta" className="bg-navy-900">
        <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 id="final-cta" className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Not finding the trip you had in mind?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              Most SafarUp journeys are private trips. Tell us the dates, the people and the places —
              we will come back with a proposal you can change before you accept it.
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
              variant="secondary"
              className="bg-transparent text-white ring-white/30 hover:bg-white/10"
            >
              Browse destinations
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

/** Small text link used for a section-level "see all". */
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
