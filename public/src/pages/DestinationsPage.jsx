/**
 * Destination list — PRD §22, §17 (`/destinations`).
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

import DestinationCard from '../components/destination/DestinationCard';
import DestinationCardSkeleton from '../components/destination/DestinationCardSkeleton';
import DestinationFilters from '../components/destination/DestinationFilters';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';

const LIST_DESCRIPTION =
  'Every destination SafarUp has published, filterable by district and travel category.';

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
    <div className="pb-safe-nav">
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
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Destinations
          </h1>
          <p className="measure mt-3 text-base leading-relaxed text-navy-600">
            {hasFilters && (selectedDistrict || selectedCategory)
              ? `Showing destinations${selectedDistrict ? ` in ${selectedDistrict.name}` : ''}${
                  selectedCategory ? ` across ${selectedCategory.name}` : ''
                }.`
              : LIST_DESCRIPTION}
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
                    <li key={destination.id}>
                      <DestinationCard destination={destination} />
                    </li>
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
              <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-navy-500">
                <Icon name="compass" className="h-4 w-4" />
                That is everything published so far.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
