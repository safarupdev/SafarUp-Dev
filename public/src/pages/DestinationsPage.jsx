/**
 * Destination list — PRD §22, §17 (`/destinations`).
 *
 * This is a SUPPORTING discovery layer, not the product. A SafarUp trip is a
 * complete multi-day journey; a destination is one place a journey passes
 * through. So the page says that in its framing copy and its relationship
 * line, and its real job is routing a visitor into a journey rather than
 * ending the search on a place.
 *
 * Data comes straight from `GET /api/destinations`; nothing about a
 * destination is hardcoded here. Filters are the contract's own parameters
 * (`district`, `category`) and their values are read from the live taxonomy
 * endpoints, so the filter set can never drift from what a Content Admin has
 * actually published.
 *
 * All three states are mandatory (DESIGN_SYSTEM.md §6, PRD §72): loading
 * skeleton, empty state, error state — plus cursor pagination with an
 * explicit "load more" control rather than an infinite scroll, because an
 * endless scroll hides the end of a result set from a human and gives a
 * crawler no way to see it.
 */

import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL } from '../constants/site';
import { PATHS, destinationPath } from '../constants/routes';
import { fetchDestinations } from '../api/destinations.api';
import { fetchCategories, fetchDistricts } from '../api/taxonomy.api';
import { IS_SHOWCASE, showcaseTripsForDestination } from '../data/showcase';

import DestinationCard from '../components/destination/DestinationCard';
import DestinationCardSkeleton from '../components/destination/DestinationCardSkeleton';
import DestinationFilters from '../components/destination/DestinationFilters';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';

const LIST_DESCRIPTION =
  'The places SafarUp journeys visit, filterable by district and travel category.';

export default function DestinationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDistrict = searchParams.get('district') || undefined;
  const activeCategory = searchParams.get('category') || undefined;

  const filters = { district: activeDistrict, category: activeCategory };
  const hasFilters = Boolean(activeDistrict || activeCategory);

  const districtsQuery = useQuery({ queryKey: ['districts'], queryFn: fetchDistricts });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const listQuery = useInfiniteQuery({
    queryKey: ['destinations', filters],
    queryFn: ({ pageParam }) =>
      fetchDestinations({ district: activeDistrict, category: activeCategory, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = useMemo(
    () => (listQuery.data?.pages ?? []).flatMap((page) => page.items),
    [listQuery.data]
  );
  const hasMore = listQuery.hasNextPage ?? false;

  const taxonomyFailed = districtsQuery.isError || categoriesQuery.isError;
  const selectedDistrict = (districtsQuery.data ?? []).find((d) => d.slug === activeDistrict);
  const selectedCategory = (categoriesQuery.data ?? []).find((c) => c.slug === activeCategory);

  const structuredData = useMemo(() => {
    const blocks = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': joinUrl(SITE_URL, PATHS.destinations),
        name: 'Destinations',
        description: LIST_DESCRIPTION,
        url: joinUrl(SITE_URL, PATHS.destinations),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Destinations', item: joinUrl(SITE_URL, PATHS.destinations) },
        ],
      },
    ];

    if (items.length > 0) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((destination, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: destination.name,
          url: joinUrl(SITE_URL, destinationPath(destination.slug)),
        })),
      });
    }

    return blocks;
  }, [items]);

  useSeo({
    title: hasFilters ? 'Destinations — filtered' : 'Destinations',
    // The description stays the same for every filter permutation on purpose:
    // a filter is a view of one page, not a separate page with its own words
    // to rank for (PRD §172 — no keyword stuffing).
    description: LIST_DESCRIPTION,
    // Always the clean list URL. A filtered view is not a separate document,
    // and every permutation of the same grid pointing at itself is the
    // textbook duplicate-content trap.
    canonical: joinUrl(SITE_URL, PATHS.destinations),
    // …and it is not indexed, so it cannot compete with the canonical list.
    robots: hasFilters ? 'noindex,follow' : null,
    structuredData,
  });

  const isInitialLoading = listQuery.isPending;
  const isError = listQuery.isError;

  return (
    // Bottom-nav clearance is NOT applied per page. PublicLayout reserves it
    // once, on the footer, so every route is covered — including this one.
    <div>
      <div className="border-b border-navy-100 bg-navy-50/70">
        <div className="mx-auto max-w-shell px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs font-medium text-navy-500">
              <li>
                <Link to={PATHS.home} className="rounded hover:text-navy-800">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-navy-800">Destinations</li>
            </ol>
          </nav>

          <p className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
            <Icon name="mapPin" className="h-4 w-4" />
            Where SafarUp journeys go
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Destinations
          </h1>
          <p className="measure mt-3 text-base leading-relaxed text-navy-600">
            A SafarUp trip is a complete multi-day route, not a single place — it sets out from
            one destination, crosses at least one more, sleeps on the way and comes back. This
            index is the supporting layer underneath that: every destination we have published, so
            you can see what a journey passes through before you choose one.
          </p>
          {hasFilters && (selectedDistrict || selectedCategory) ? (
            <p className="measure mt-3 text-base leading-relaxed text-navy-600">
              Showing destinations{selectedDistrict ? ` in ${selectedDistrict.name}` : ''}
              {selectedCategory ? ` across ${selectedCategory.name}` : ''}.
            </p>
          ) : null}
          <p className="mt-5">
            <Button as="link" to={PATHS.trips} size="md">
              See the journeys
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-shell px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
          <aside aria-label="Destination filters" className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <DestinationFilters
              districts={districtsQuery.data ?? []}
              categories={categoriesQuery.data ?? []}
              activeDistrict={activeDistrict}
              activeCategory={activeCategory}
              disabled={taxonomyFailed}
            />
            {taxonomyFailed ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
                Filters could not be loaded, so the list below is unfiltered. Reload the page to try
                again.
              </p>
            ) : null}
          </aside>

          <section aria-label="Destinations" aria-busy={isInitialLoading}>
            <h2 className="sr-only">Destination results</h2>

            {isError ? (
              <ErrorState
                error={listQuery.error}
                onRetry={() => listQuery.refetch()}
                title="We could not load destinations"
              />
            ) : null}

            {isInitialLoading ? (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index}>
                    <DestinationCardSkeleton />
                  </li>
                ))}
              </ul>
            ) : null}

            {!isError && !isInitialLoading && items.length === 0 ? (
              <EmptyState
                icon="mapPin"
                title={
                  hasFilters
                    ? 'No destinations match these filters'
                    : 'No destinations are published yet'
                }
                description={
                  hasFilters
                    ? 'Try clearing a filter, or browse everything SafarUp has published so far.'
                    : 'SafarUp publishes destinations as they are prepared. In the meantime, tell us where you want to go and we will build the trip.'
                }
                action={hasFilters ? 'Clear all filters' : 'Plan a Private Trip'}
                {...(hasFilters
                  ? { onAction: () => setSearchParams(new URLSearchParams(), { replace: true }) }
                  : { actionTo: PATHS.planTrip })}
              />
            ) : null}

            {items.length > 0 ? (
              <>
                <p className="mb-4 text-sm text-navy-600">
                  Showing {items.length} destination{items.length === 1 ? '' : 's'}
                  {hasMore ? ' so far' : ''}
                </p>
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((destination) => (
                    <DestinationListItem key={destination.id} destination={destination} />
                  ))}
                </ul>

                {hasMore ? (
                  <div className="mt-10 flex justify-center">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => listQuery.fetchNextPage()}
                      disabled={listQuery.isFetchingNextPage}
                    >
                      {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more destinations'}
                    </Button>
                  </div>
                ) : null}

                {listQuery.isFetchingNextPage ? <span className="sr-only" role="status">Loading more destinations</span> : null}
              </>
            ) : null}

            {!isInitialLoading && !isError && items.length > 0 ? (
              <p className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-navy-500">
                <span className="flex items-center gap-2">
                  <Icon name="compass" className="h-4 w-4" />
                  That is every destination published so far.
                </span>
                <Link
                  to={PATHS.trips}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-semibold text-brand-700 transition-colors duration-150 ease-standard hover:bg-navy-50"
                >
                  Ready to pick a route through one of them?
                  <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * A destination card plus its journey relationship.
 *
 * The line lives HERE, in a page-local wrapper, rather than inside
 * `DestinationCard`: that component is shared with Home and Explore, and a
 * journey count only makes sense on the page whose job is routing people from
 * a place into a journey. Putting it in the shared card would assert a
 * relationship on surfaces that have no business making it.
 *
 * **The count is derived, never asserted.** `showcaseTripsForDestination`
 * matches `trip.destinationSlug` EXACTLY against this destination's slug — no
 * district match, no keyword match, no hand-written list, because each of
 * those invents a relationship the data does not state. A destination no
 * journey points at renders NOTHING here, which is the correct answer:
 * "On 0 journeys" is a statement about a gap, and a grid of them would read as
 * a broken relationship rather than an honest one.
 *
 * Featured destinations keep their prominence: the card's own Featured badge
 * is untouched, and the relationship line is deliberately quieter than the
 * badge so it never competes with it for attention.
 */
function DestinationListItem({ destination }) {
  const journeys = showcaseTripsForDestination(destination.slug);

  return (
    <li className="flex flex-col">
      <DestinationCard destination={destination} />
      {journeys.length > 0 ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-navy-600">
          <Icon name="route" className="h-3.5 w-3.5 flex-none text-navy-500" />
          <span>
            {/* "Example" while showcase, so this indexed page cannot imply a
                published departure that does not exist. `TripCard` carries the
                same qualifier, but this line has no card of its own. */}
            On {journeys.length}{' '}
            {IS_SHOWCASE ? 'example SafarUp journey' : 'SafarUp journey'}
            {journeys.length === 1 ? '' : 's'}
            {/* `journeys.length` is the count; the word after it is the only
                thing `IS_SHOWCASE` changes. The leading ternary above is
                identical in both branches and exists only to document that —
                it must not be read as a conditional. */}
          </span>
        </p>
      ) : null}
    </li>
  );
}
