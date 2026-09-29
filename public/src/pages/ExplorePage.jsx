/**
 * Explore — the discovery surface, journey-first (PRD §19, §22;
 * DESIGN_SYSTEM.md §6).
 *
 * A SafarUp trip is a COMPLETE multi-day journey: it starts somewhere, crosses
 * at least one more place, sleeps on the way, and comes back. So the page is
 * ordered the way the product is built — journeys first and dominant, the
 * destinations they visit second and compact. Leading with a grid of places
 * teaches the exact opposite of the product model, and a visitor who picked
 * "Bodh Gaya" would have no idea a two-day circuit runs through it.
 *
 * Section order: search · journeys (dominant) · destinations (subordinate).
 *
 * **Journey filters are derived, never hand-listed.** Duration buckets are
 * keyed on the numeric `nights` field, and the season and trip-type options
 * are de-duplicated from the journeys' own `seasonShort` / `tripType`. A chip
 * therefore cannot claim to filter something the data does not contain.
 *
 * **Search honesty.** The backend's `q` answers 400 SEARCH_NOT_AVAILABLE
 * (API.destination.contract.md §2.1b), so nothing here sends `q`. The box
 * filters the journeys published on this page and the destinations already
 * loaded in the browser, and says exactly that. It never claims full-text
 * search across the catalogue.
 *
 * **Filter state is component state, not the query string.** Unlike
 * `/destinations`, these filters run client-side over data already in memory:
 * a crawler arriving at `/explore?district=gaya` would be served the
 * unfiltered page, so the URL would advertise a view it cannot reproduce. The
 * server-filtered, shareable permalinks live on `/destinations`, which owns
 * them.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL } from '../constants/site';
import { PATHS } from '../constants/routes';
import { fetchDestinations } from '../api/destinations.api';
import { fetchCategories, fetchDistricts } from '../api/taxonomy.api';
import { SHOWCASE_NOTICE, SHOWCASE_TRIPS, tripRouteSummary } from '../data/showcase';

import TripCard from '../components/journey/TripCard';
import DestinationCard from '../components/destination/DestinationCard';
import DestinationCardSkeleton from '../components/destination/DestinationCardSkeleton';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Button from '../components/common/Button';
import Chip from '../components/common/Chip';
import Icon from '../components/common/Icon';

const PAGE_SIZE = 12;

/**
 * Module-level so the identity is stable across renders. `useSeo`'s effect
 * depends on this, and an inline literal meant every search keystroke tore down
 * and rewrote the entire document head.
 *
 * Deliberately NO `ItemList` of journeys. `/explore` is indexed, and listing
 * showcase itineraries as schema.org items would assert bookable inventory on
 * an indexable page — the exact thing the `noindex` work on `/trips` prevents.
 */
const EXPLORE_STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': joinUrl(SITE_URL, PATHS.explore),
    name: 'Explore SafarUp journeys and destinations',
    description:
      'Browse complete multi-day SafarUp journeys, and the destinations and places they visit.',
    url: joinUrl(SITE_URL, PATHS.explore),
    isPartOf: { '@id': joinUrl(SITE_URL, '/#website') },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: joinUrl(SITE_URL, PATHS.home) },
      { '@type': 'ListItem', position: 2, name: 'Explore', item: joinUrl(SITE_URL, PATHS.explore) },
    ],
  },
];

/**
 * Duration buckets, keyed on the numeric `nights` rather than the display
 * string `2 Days / 1 Night`. `nights` is the only numeric duration the data
 * carries; parsing the display string would be a second source of truth for
 * how long a journey is, free to drift from the itinerary that produced it.
 */
const DURATION_FILTERS = [
  { id: 'all', label: 'Any length', min: 0, max: Number.MAX_SAFE_INTEGER },
  { id: 'short', label: '1 to 2 days', min: 0, max: 1 },
  { id: 'long', label: '3 days or more', min: 2, max: Number.MAX_SAFE_INTEGER },
];

/** Distinct `seasonShort` values across the published journeys. */
const SEASON_FILTERS = [
  { id: 'all', label: 'Any season', season: null },
  ...[...new Set(SHOWCASE_TRIPS.map((trip) => trip.seasonShort).filter(Boolean))]
    .sort()
    .map((season) => ({ id: season, label: season, season })),
];

/** Distinct `tripType` values across the published journeys. */
const TYPE_FILTERS = [
  { id: 'all', label: 'All types', type: null },
  ...[...new Set(SHOWCASE_TRIPS.map((trip) => trip.tripType).filter(Boolean))]
    .sort()
    .map((type) => ({ id: type, label: type, type })),
];

/** The chip label for an active id, or '' for the "all" option. */
function labelOf(options, id) {
  return options.find((option) => option.id === id)?.label ?? '';
}

/** `a`, `a and b`, `a, b and c` — used to name the active filters. */
function andList(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export default function ExplorePage() {
  const [term, setTerm] = useState('');
  const [durationId, setDurationId] = useState('all');
  const [seasonId, setSeasonId] = useState('all');
  const [typeId, setTypeId] = useState('all');
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

  // Client-side only. Never sent to the API — see the search-honesty note.
  const needle = term.trim().toLowerCase();

  const activeDuration =
    DURATION_FILTERS.find((option) => option.id === durationId) ?? DURATION_FILTERS[0];
  const activeSeason = SEASON_FILTERS.find((option) => option.id === seasonId) ?? SEASON_FILTERS[0];
  const activeType = TYPE_FILTERS.find((option) => option.id === typeId) ?? TYPE_FILTERS[0];

  const activeJourneyLabels = [
    durationId === 'all' ? '' : labelOf(DURATION_FILTERS, durationId),
    seasonId === 'all' ? '' : labelOf(SEASON_FILTERS, seasonId),
    typeId === 'all' ? '' : labelOf(TYPE_FILTERS, typeId),
  ].filter(Boolean);

  const visibleTrips = useMemo(
    () =>
      SHOWCASE_TRIPS.filter((trip) => {
        const nights = trip.nights ?? 0;
        if (nights < activeDuration.min || nights > activeDuration.max) return false;
        if (activeSeason.season && trip.seasonShort !== activeSeason.season) return false;
        if (activeType.type && trip.tripType !== activeType.type) return false;
        if (!needle) return true;

        const haystack = [
          trip.title,
          trip.subtitle,
          trip.summary,
          trip.overview,
          trip.district,
          trip.tripType,
          trip.season,
          tripRouteSummary(trip),
          ...(trip.route ?? []).map((leg) => leg.name),
          ...(trip.highlights ?? []),
          ...(trip.placesCovered ?? []).map((place) => place.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      }),
    [activeDuration, activeSeason, activeType, needle]
  );

  const filteredDestinations = useMemo(
    () =>
      all.filter((destination) => {
        if (district && destination.district?.slug !== district) return false;
        if (category && !(destination.categories ?? []).some((item) => item.slug === category)) return false;
        if (!needle) return true;
        const haystack = [
          destination.name,
          destination.shortDescription,
          destination.district?.name,
          ...(destination.categories ?? []).map((item) => item.name),
          ...(destination.places ?? []).map((place) => place.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      }),
    [all, district, category, needle]
  );

  const visibleDestinations = filteredDestinations.slice(0, limit);

  const hasJourneyFilters = durationId !== 'all' || seasonId !== 'all' || typeId !== 'all';
  const hasDestinationFilters = Boolean(district || category);
  const hasFilters = hasJourneyFilters || hasDestinationFilters || Boolean(needle);

  const clearAll = () => {
    setTerm('');
    setDurationId('all');
    setSeasonId('all');
    setTypeId('all');
    setDistrict('');
    setCategory('');
    setLimit(PAGE_SIZE);
  };

  const clearJourneyFilters = () => {
    setDurationId('all');
    setSeasonId('all');
    setTypeId('all');
  };

  const clearDestinationFilters = () => {
    setDistrict('');
    setCategory('');
    setLimit(PAGE_SIZE);
  };

  const destinationsPending = destinationsQuery.isPending;
  const destinationsFailed = destinationsQuery.isError;
  const destinationsEmpty = !destinationsPending && !destinationsFailed && all.length === 0;

  useSeo({
    title: 'Explore',
    // "across Bihar" here contradicted `DEFAULT_DESCRIPTION` ("across India")
    // for the same product on the same site. Two pages disagreeing about the
    // scope of the catalogue is a factual inconsistency, not a targeting
    // strategy — the routes are being published beyond one state.
    description:
      'Browse complete multi-day SafarUp journeys and the destinations they pass through — temples, heritage, hills and wildlife across India.',
    // Was a hardcoded '/explore'. It agreed with PATHS.explore today, but a
    // literal is a second source of truth for a canonical URL: the day the
    // route moves, this silently keeps asserting the old one.
    canonical: joinUrl(SITE_URL, PATHS.explore),
    // Stable identity: `useSeo`'s effect depends on this value, and an inline
    // array literal is a new object every render — so every keystroke in the
    // search box tore down and rewrote the whole document head. Hoisted to a
    // module constant because it depends on nothing.
    structuredData: EXPLORE_STRUCTURED_DATA,
  });

  return (
    <>
      <ExploreHero
        term={term}
        onTermChange={(value) => {
          setTerm(value);
          setLimit(PAGE_SIZE);
        }}
        destinationCount={all.length}
        loading={destinationsPending}
      />

      <JourneysSection
        visibleTrips={visibleTrips}
        durationId={durationId}
        seasonId={seasonId}
        typeId={typeId}
        onDuration={(id) => setDurationId(id)}
        onSeason={(id) => setSeasonId(id)}
        onType={(id) => setTypeId(id)}
        activeLabels={activeJourneyLabels}
        onClear={clearJourneyFilters}
        onClearAll={clearAll}
        filtered={hasJourneyFilters || Boolean(needle)}
      />

      <DestinationsSection
        visible={visibleDestinations}
        filteredCount={filteredDestinations.length}
        districts={districtsQuery.data ?? []}
        categories={categoriesQuery.data ?? []}
        district={district}
        category={category}
        onDistrict={(value) => {
          setDistrict(value);
          setLimit(PAGE_SIZE);
        }}
        onCategory={(value) => {
          setCategory(value);
          setLimit(PAGE_SIZE);
        }}
        onClear={clearDestinationFilters}
        pending={destinationsPending}
        failed={destinationsFailed}
        empty={destinationsEmpty}
        error={destinationsQuery.error}
        onRetry={() => destinationsQuery.refetch()}
        hasFilters={hasFilters}
        onClearAll={clearAll}
        onShowMore={() => setLimit((current) => current + PAGE_SIZE)}
      />
    </>
  );
}

/* ==========================================================================
   SEARCH — the hero entry point.

   It sits on the dark surface rather than in a sticky bar because it is the
   first thing a visitor reaches and the thing they will look for. Sticky would
   help a long scroll, but a permanent bar competes with the journey grid that
   is the point of the page; the input is duplicated nowhere, and the page is
   short enough that the hero stays the natural starting point.
   ========================================================================== */

function ExploreHero({ term, onTermChange, destinationCount, loading }) {
  return (
    <section aria-labelledby="explore-heading" className="on-dark relative isolate overflow-hidden bg-navy-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(60rem 30rem at 15% -10%, rgba(249,115,22,0.28), transparent 60%), radial-gradient(50rem 30rem at 90% 10%, rgba(37,99,235,0.35), transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-shell px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Explore</p>
        <h1
          id="explore-heading"
          className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
        >
          Start with the journey, not the place
        </h1>
        <p className="measure mt-5 text-lg leading-relaxed text-white/80">
          Every SafarUp trip is a complete multi-day route — it sets out from one place, crosses at
          least one more, sleeps on the way and comes back. Choose a journey and the whole route is
          written out for you, or search by a place, a district or a route.
        </p>

        <div className="mt-9 max-w-2xl">
          <label htmlFor="explore-search" className="block text-xs font-bold uppercase tracking-wider text-white/70">
            Search journeys and destinations
          </label>
          <div className="relative mt-2">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy-500"
            >
              <Icon name="compass" className="h-5 w-5" />
            </span>
            <input
              id="explore-search"
              type="search"
              value={term}
              onChange={(event) => onTermChange(event.target.value)}
              placeholder="Jamui, Mahabodhi, Nalanda, 3 days…"
              autoComplete="off"
              className="w-full rounded-card border border-navy-700 bg-white py-3.5 pl-12 pr-4 text-base text-navy-900 shadow-card placeholder:text-navy-500 focus:border-brand-500"
            />
          </div>
          {/*
            The honesty note stays. Search here is NOT full-text search over the
            whole catalogue — the backend's `q` answers 400
            SEARCH_NOT_AVAILABLE (§2.1b) — so it matches the journeys on this
            page and the destinations already loaded, and it says so rather than
            letting a visitor assume otherwise.
          */}
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-white/70">
            <Icon name="info" className="mt-0.5 h-4 w-4 flex-none text-accent-300" />
            <span className="measure">
              {loading
                ? 'Search matches the journeys published on this page and the destinations SafarUp has loaded. Full-text search across the whole catalogue is not available yet.'
                : // The count is dropped when it is zero. Interpolating it anyway
                  // rendered the sentence as "the 0 destinations SafarUp has
                  // loaded", which reads as a broken catalogue rather than an
                  // honest statement about search scope.
                  `Search matches the journeys published on this page and the ${
                    destinationCount > 0
                      ? `${destinationCount} destination${destinationCount === 1 ? '' : 's'}`
                      : 'destinations'
                  } SafarUp has loaded. Full-text search across the whole catalogue is not available yet.`}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   JOURNEYS — the dominant section.

   Everything about this section is sized up relative to the destinations
   below it: a display-scale heading, a wider grid, a feature card, more
   vertical space and a full filter bar. That is the hierarchy doing the
   product work — the page should be scannable in one glance as "this is a
   page of routes", with the place grid reading as the supporting index.
   ========================================================================== */

function FilterGroup({ legend, children }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">{legend}</legend>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">{children}</div>
    </fieldset>
  );
}

function JourneysSection({
  visibleTrips,
  durationId,
  seasonId,
  typeId,
  onDuration,
  onSeason,
  onType,
  activeLabels,
  onClear,
  onClearAll,
  filtered,
}) {
  return (
    <section aria-labelledby="journeys-heading" className="mx-auto max-w-shell px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-700">
            <Icon name="route" className="h-4 w-4" />
            Journeys
          </p>
          <h2
            id="journeys-heading"
            className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-navy-900 sm:text-4xl"
          >
            Complete routes, published end to end
          </h2>
          <p className="measure mt-4 text-lg leading-relaxed text-navy-600">
            Each one starts somewhere, crosses at least one more place, sleeps on the way and comes
            back. Every stop and every night is written out before you decide anything.
          </p>
        </div>
        <Button as="link" to={PATHS.trips} variant="secondary" className="self-start lg:self-auto">
          All journeys
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>

      {/*
        Showcase notice, stated once here rather than as an alert on every
        card: the content is example material, and saying so calmly beside the
        filters reads as a fact about the catalogue rather than a fault
        (DESIGN_SYSTEM §13). `TripCard` still labels each card individually.
      */}
      <div className="mt-8 flex items-start gap-4 rounded-card border border-navy-100 bg-navy-50/70 px-5 py-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-accent-700 ring-1 ring-navy-100"
        >
          <Icon name="info" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-700">
            {SHOWCASE_NOTICE.title}
          </p>
          <p className="measure mt-1 text-sm leading-relaxed text-navy-600">{SHOWCASE_NOTICE.body}</p>
        </div>
      </div>

      {/* Journey filters. Chips, so a filter reads as a state and not a query. */}
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <FilterGroup legend="Length">
          {DURATION_FILTERS.map((option) => (
            <Chip key={option.id} active={option.id === durationId} onClick={() => onDuration(option.id)}>
              {option.label}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup legend="Season">
          {SEASON_FILTERS.map((option) => (
            <Chip key={option.id} active={option.id === seasonId} onClick={() => onSeason(option.id)}>
              {option.label}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup legend="Trip type">
          {TYPE_FILTERS.map((option) => (
            <Chip key={option.id} active={option.id === typeId} onClick={() => onType(option.id)}>
              {option.label}
            </Chip>
          ))}
        </FilterGroup>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-navy-700" role="status">
          {visibleTrips.length} {visibleTrips.length === 1 ? 'journey' : 'journeys'}
          {activeLabels.length > 0 ? ` · ${andList(activeLabels)}` : ' published so far'}
        </p>
        {filtered ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand-700 transition-colors duration-150 ease-standard hover:bg-navy-50"
          >
            <Icon name="minus" className="h-4 w-4" />
            Clear journey filters
          </button>
        ) : null}
      </div>

      {visibleTrips.length > 0 ? (
        <ul className="mt-7 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {visibleTrips.map((trip, index) => (
            // The span lives on the `<li>`, not on `TripCard`: a grid track is
            // only spanned by a DIRECT child of the grid, and the `<li>` is
            // that child. `md:` because the grid only becomes multi-column
            // at `md`.
            <li key={trip.slug} className={index === 0 ? 'md:col-span-2' : undefined}>
              <TripCard trip={trip} priority={index === 0 ? 'feature' : 'default'} />
            </li>
          ))}
        </ul>
      ) : (
        <JourneyNoResults labelled={activeLabels.length > 0} onClear={onClear} onClearAll={onClearAll} />
      )}
    </section>
  );
}

/**
 * No journeys matched.
 *
 * This is the one place a filtered page can look broken, so it is designed as
 * a deliberate state rather than a fallback: a bordered panel naming exactly
 * which filter emptied the grid, an offer to widen it, and a route into a
 * private trip — which is genuinely available and is the real answer when the
 * published catalogue does not cover what someone is looking for.
 */
function JourneyNoResults({ labelled, onClear, onClearAll }) {
  return (
    <div className="mt-7 rounded-card border border-navy-200 bg-navy-50/60 px-6 py-14 text-center sm:px-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-accent-700 ring-1 ring-navy-100">
        <Icon name="route" className="h-6 w-6" />
      </span>
      <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-navy-900">
        No journey matches that yet
      </h3>
      <p className="measure mx-auto mt-3 text-base leading-relaxed text-navy-600">
        {labelled
          ? 'None of the journeys published so far fits that combination. Journeys are added as their itineraries are written and checked, so this filter will fill up.'
          : 'No journey matches that search. Journeys are added as their itineraries are written and checked, so it is worth looking again once a season.'}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {labelled ? (
          <Button onClick={onClear} size="lg">
            Show every journey
          </Button>
        ) : (
          <Button onClick={onClearAll} size="lg">
            Clear the search
          </Button>
        )}
        <Button as="link" to={PATHS.planTrip} variant="secondary" size="lg">
          Plan a Private Trip
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
      <p className="measure mx-auto mt-6 text-sm leading-relaxed text-navy-500">
        Looking for a place rather than a route? Every destination SafarUp has published is listed
        below.
      </p>
    </div>
  );
}

/* ==========================================================================
   DESTINATIONS — the subordinate section.

   Deliberately quieter than the journeys above it: a smaller display heading,
   a tighter grid, a neutral banded surface, and compact filter controls
   rather than chips. The one line of framing copy is load-bearing — it is
   what stops this grid from reading as the product.

   The district and category controls are the same live-taxonomy selects the
   page already used, kept client-side over the one loaded page of results
   (the honest search note above explains the difference from
   `/destinations`, which filters server-side).
   ========================================================================== */

function DestinationsSection({
  visible,
  filteredCount,
  districts,
  categories,
  district,
  category,
  onDistrict,
  onCategory,
  onClear,
  pending,
  failed,
  empty,
  error,
  onRetry,
  hasFilters,
  onClearAll,
  onShowMore,
}) {
  const hasDestinationFilters = Boolean(district || category);

  return (
    <section
      aria-labelledby="destinations-heading"
      className="border-y border-navy-100 bg-navy-50/70 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
            <Icon name="mapPin" className="h-4 w-4" />
            Destinations
          </p>
          <h2
            id="destinations-heading"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
          >
            The places those journeys visit
          </h2>
          <p className="measure mt-3 text-sm leading-relaxed text-navy-600">
            A destination is one stop on someone&rsquo;s route — the temples, ruins, hills and
            sanctuaries a SafarUp journey passes through. Open one to read what is there, then go
            back to the journeys to see how they fit together.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          {/*
            Real `<label>`s, visually hidden. These were `aria-label` only —
            which does name them for assistive tech, but leaves the control with
            no visible label, no click target and no form association, and it
            breaks the moment the markup is reflowed. `sr-only` keeps the
            layout while restoring a proper label/control pair.
          */}
          <label htmlFor="explore-district" className="sr-only">
            Filter destinations by district
          </label>
          <select
            id="explore-district"
            value={district}
            onChange={(event) => onDistrict(event.target.value)}
            className="min-h-11 rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-800 shadow-sm focus:border-brand-500"
          >
            <option value="">All districts</option>
            {districts.map((item) => (
              <option key={item.id ?? item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>

          <label htmlFor="explore-category" className="sr-only">
            Filter destinations by category
          </label>
          <select
            id="explore-category"
            value={category}
            onChange={(event) => onCategory(event.target.value)}
            className="min-h-11 rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-800 shadow-sm focus:border-brand-500"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id ?? item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-600" role="status">
            {pending
              ? 'Loading destinations…'
              : empty
                ? ''
                : `${filteredCount} destination${filteredCount === 1 ? '' : 's'}`}
          </p>
          {hasDestinationFilters ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand-700 transition-colors duration-150 ease-standard hover:bg-white"
            >
              <Icon name="minus" className="h-4 w-4" />
              Clear destination filters
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          {pending ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <li key={index}>
                  <DestinationCardSkeleton />
                </li>
              ))}
            </ul>
          ) : null}

          {failed ? (
            <ErrorState error={error} onRetry={onRetry} title="We could not load destinations" />
          ) : null}

          {empty ? (
            <EmptyState
              icon="mapPin"
              title="No destinations are published yet"
              description="SafarUp publishes destinations as they are prepared. Tell us where you want to go and we will build the trip."
              action="Plan a Private Trip"
              actionTo={PATHS.planTrip}
            />
          ) : null}

          {!pending && !failed && !empty && visible.length === 0 ? (
            <EmptyState
              icon="compass"
              title="No destination matches that"
              description="Try a different district or category, or clear the search. Nothing here is hidden from you — this is simply the whole published set."
              action="Clear all filters"
              onAction={hasFilters ? onClearAll : undefined}
            />
          ) : null}

          {visible.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((destination) => (
                <li key={destination.id}>
                  <DestinationCard destination={destination} />
                </li>
              ))}
            </ul>
          ) : null}

          {/*
            Client-side paging over the loaded page of results, unchanged in
            behaviour from the previous implementation. It is a real control
            rather than an infinite scroll: an endless feed hides the end of a
            result set from a person and gives a crawler no way to see it.
          */}
          {filteredCount > visible.length ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={onShowMore}
                className="inline-flex min-h-12 items-center rounded-full border border-navy-200 bg-white px-6 text-sm font-semibold text-navy-800 shadow-sm transition-colors duration-150 ease-standard hover:bg-navy-50"
              >
                Show more ({filteredCount - visible.length} remaining)
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-10 text-sm text-navy-500">
          Looking for the full destination index, filterable by district and category?{' '}
          <Link to={PATHS.destinations} className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:text-brand-600">
            Browse all destinations
            <Icon name="arrowRight" className="ml-1.5 h-4 w-4" />
          </Link>{' '}
        </p>
      </div>
    </section>
  );
}
