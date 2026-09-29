/**
 * Explore — the discovery surface (PRD §19, §22; DESIGN_SYSTEM.md §6).
 *
 * Combines live destinations, live district/category taxonomy, and client-side
 * search over the loaded result set.
 *
 * **Search honesty.** The backend's `q` answers 400 SEARCH_NOT_AVAILABLE
 * (API.destination.contract.md §2.1b), so the search box filters the
 * destinations already loaded in the browser and says so. It never sends `q`
 * and never pretends to search the whole catalogue.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL } from '../constants/site';
import { PATHS } from '../constants/routes';
import { fetchDestinations } from '../api/destinations.api';
import { fetchCategories, fetchDistricts } from '../api/taxonomy.api';

import DestinationCard from '../components/destination/DestinationCard';
import DestinationCardSkeleton from '../components/destination/DestinationCardSkeleton';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Icon from '../components/common/Icon';

const PAGE_SIZE = 12;

export default function ExplorePage() {
  const [term, setTerm] = useState('');
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const districtsQuery = useQuery({ queryKey: ['districts', 'explore'], queryFn: fetchDistricts });
  const categoriesQuery = useQuery({ queryKey: ['categories', 'explore'], queryFn: fetchCategories });

  const destinationsQuery = useQuery({
    queryKey: ['destinations', { explore: true }],
    // 100 is the API's documented hard maximum (§2.1). The full published set
    // is loaded so client-side search is meaningful; paging below is UI-only.
    queryFn: () => fetchDestinations({ limit: 100 }),
  });

  const all = useMemo(() => destinationsQuery.data?.items ?? [], [destinationsQuery.data]);

  // Server-side filters, then the client-side term over the result.
  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return all.filter((destination) => {
      if (district && destination.district?.slug !== district) return false;
      if (category && !(destination.categories ?? []).some((c) => c.slug === category)) return false;
      if (!needle) return true;
      const haystack = [
        destination.name,
        destination.shortDescription,
        destination.district?.name,
        ...(destination.categories ?? []).map((c) => c.name),
        ...(destination.places ?? []).map((p) => p.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [all, term, district, category]);

  const visible = filtered.slice(0, limit);
  const hasFilters = Boolean(term || district || category);

  useSeo({
    title: 'Explore',
    // "across Bihar" here contradicted `DEFAULT_DESCRIPTION` ("across India")
    // for the same product on the same site. Two pages disagreeing about the
    // scope of the catalogue is a factual inconsistency, not a targeting
    // strategy — the routes are being published beyond one state.
    description:
      'Browse SafarUp destinations by district, by category, and by what you want to do — temples, heritage, hills and wildlife across India.',
    // Was a hardcoded '/explore'. It agreed with PATHS.explore today, but a
    // literal is a second source of truth for a canonical URL: the day the
    // route moves, this silently keeps asserting the old one.
    canonical: joinUrl(SITE_URL, PATHS.explore),
  });

  return (
    <>
      <section aria-labelledby="explore-heading" className="bg-navy-950 py-14 sm:py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Explore</p>
          <h1
            id="explore-heading"
            className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl"
          >
            Find where you want to go
          </h1>
          <p className="measure mt-4 text-lg leading-relaxed text-white/80">
            Filter by district or by what the trip is about.
          </p>
        </div>
      </section>

      {/* Controls */}
      <section aria-label="Filter destinations" className="sticky top-16 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-shell px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <label htmlFor="explore-search" className="sr-only">
                Search the loaded destinations
              </label>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400"
              >
                <Icon name="compass" className="h-4 w-4" />
              </span>
              <input
                id="explore-search"
                type="search"
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                  setLimit(PAGE_SIZE);
                }}
                placeholder="Search loaded destinations, places, districts…"
                // No `focus:outline-none`. The site draws one focus ring from a
                // central `:focus-visible` rule (index.css); removing the
                // outline on the control deletes the only focus indicator this
                // input has. `focus:border-brand-500` still fires alongside it.
                className="w-full rounded-xl border border-navy-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-navy-900 shadow-sm placeholder:text-navy-500 focus:border-brand-500"
              />
            </div>

            {/*
              Real `<label>`s, visually hidden. These were `aria-label` only —
              which does name them for assistive tech, but leaves the control
              with no visible label, no click target and no form association,
              and it breaks the moment the markup is reflowed. `sr-only` keeps
              the layout while restoring a proper label/control pair.
            */}
            <label htmlFor="explore-district" className="sr-only">
              Filter by district
            </label>
            <select
              id="explore-district"
              value={district}
              onChange={(event) => {
                setDistrict(event.target.value);
                setLimit(PAGE_SIZE);
              }}
              className="rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-800 shadow-sm focus:border-brand-500"
            >
              <option value="">All districts</option>
              {(districtsQuery.data ?? []).map((item) => (
                <option key={item.id ?? item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>

            <label htmlFor="explore-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="explore-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setLimit(PAGE_SIZE);
              }}
              className="rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-800 shadow-sm focus:border-brand-500"
            >
              <option value="">All categories</option>
              {(categoriesQuery.data ?? []).map((item) => (
                <option key={item.id ?? item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-2.5 text-xs text-navy-500">
            Search filters the {all.length} destination{all.length === 1 ? '' : 's'} loaded on this
            page. Full-text search is not available yet.
          </p>
        </div>
      </section>

      <section aria-labelledby="explore-results" className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="explore-results"
            className="font-display text-xl font-bold tracking-tight text-navy-900"
          >
            {filtered.length} destination{filtered.length === 1 ? '' : 's'}
          </h2>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setTerm('');
                setDistrict('');
                setCategory('');
                setLimit(PAGE_SIZE);
              }}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-brand-700 hover:bg-navy-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          {destinationsQuery.isPending ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <li key={index}>
                  <DestinationCardSkeleton />
                </li>
              ))}
            </ul>
          ) : null}

          {destinationsQuery.isError ? (
            <ErrorState
              error={destinationsQuery.error}
              onRetry={() => destinationsQuery.refetch()}
              title="We could not load destinations"
            />
          ) : null}

          {!destinationsQuery.isPending && !destinationsQuery.isError && all.length === 0 ? (
            <EmptyState
              icon="mapPin"
              title="No destinations are published yet"
              description="SafarUp publishes destinations as they are prepared. Tell us where you want to go and we will build the trip."
              action="Plan a Private Trip"
              actionTo={PATHS.planTrip}
            />
          ) : null}

          {all.length > 0 && filtered.length === 0 ? (
            <EmptyState
              icon="compass"
              title="Nothing matches those filters"
              description="Try a different district or category, or clear the search."
            />
          ) : null}

          {visible.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((destination) => (
                <li key={destination.id}>
                  <DestinationCard destination={destination} />
                </li>
              ))}
            </ul>
          ) : null}

          {filtered.length > visible.length ? (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
                className="min-h-12 rounded-full border border-navy-200 bg-white px-6 text-sm font-semibold text-navy-800 shadow-sm hover:bg-navy-50"
              >
                Show more ({filtered.length - visible.length} remaining)
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
