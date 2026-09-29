/**
 * JourneyAtAGlance — the horizontal band that answers, at a glance, the
 * questions a traveller actually has about a multi-day trip:
 *
 *   Where do we start? Where do we go? Where do we sleep? Where do we end?
 *   And how many places does this cover?
 *
 * It is the counterweight to the itinerary: the itinerary is depth, this is
 * shape. Both are needed, because a fourteen-section day-by-day page is
 * unreadable to someone who has not yet decided.
 *
 * Every number here is derived from the trip's own `route` and `itinerary`
 * (`tripLocationClusters`), so the band cannot advertise a location or a place
 * count that the day-by-day plan does not actually contain.
 */

import { tripLocationClusters, tripRouteDescription, tripRouteSummary } from '../../data/showcase';
import RouteLine from './RouteLine';
import Icon from '../common/Icon';

const ROLE_LABEL = {
  start: 'Start',
  overnight: 'Overnight',
  return: 'Return',
  stop: 'Stop',
};

export default function JourneyAtAGlance({ trip, className = '' }) {
  if (!trip?.route?.length) return null;

  const clusters = tripLocationClusters(trip);
  const nights = trip.nights ?? 0;

  return (
    <section
      aria-label="Journey at a glance"
      className={`rounded-2xl border border-navy-100 bg-navy-50/70 p-5 sm:p-7 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight text-navy-900">
          Journey at a glance
        </h2>
        <p className="text-sm font-semibold text-navy-600">{tripRouteSummary(trip)}</p>
      </div>

      <p className="sr-only">{tripRouteDescription(trip)}</p>

      <div className="mt-4">
        <RouteLine route={trip.route} size="md" />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clusters.map((cluster) => {
          const leg = trip.route.find((entry) => entry.name === cluster.location);
          const isOvernight = leg?.role === 'overnight';
          const isStart = leg?.role === 'start';
          const isReturn = leg?.role === 'return';

          return (
            <div
              key={cluster.location}
              className="rounded-xl border border-navy-100 bg-white p-4 shadow-card"
            >
              <dt className="flex items-center gap-2">
                {isOvernight ? (
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-700 text-white">
                    <Icon name="home" className="h-3 w-3" />
                  </span>
                ) : (
                  <span
                    className={`h-3 w-3 flex-none rounded-full ${
                      isStart
                        ? 'bg-accent-700 ring-4 ring-accent-100'
                        : isReturn
                          ? 'border-2 border-navy-700 bg-white ring-4 ring-navy-100'
                          : 'bg-navy-400'
                    }`}
                  />
                )}
                <span className="font-bold text-navy-900">{cluster.location}</span>
              </dt>

              <dd className="mt-2 text-sm text-navy-600">
                <span className="font-semibold text-navy-800">
                  {cluster.placeCount} {cluster.placeCount === 1 ? 'place' : 'places'}
                </span>
                {' · '}
                Day {cluster.days.join(' and ')}
              </dd>

              {isOvernight || isStart || isReturn ? (
                <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-accent-700">
                  {ROLE_LABEL[leg.role]}
                </p>
              ) : null}
            </div>
          );
        })}
      </dl>

      <p className="mt-5 flex items-center gap-2 border-t border-navy-100 pt-4 text-sm text-navy-600">
        <Icon name="clock" className="h-4 w-4 flex-none text-navy-400" />
        <span>
          {trip.duration}
          {nights > 0
            ? ` — you sleep ${nights} night${nights === 1 ? '' : 's'} on the way.`
            : ' — no overnight on this journey.'}
        </span>
      </p>
    </section>
  );
}
