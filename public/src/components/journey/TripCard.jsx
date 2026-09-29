/**
 * TripCard — a journey card.
 *
 * Used on Journeys, Home and Explore, so a journey is presented identically
 * everywhere it appears. That consistency is the point: the product is the
 * journey, and the card has to teach that on first sight.
 *
 * What makes this a JOURNEY card rather than a destination card is the route
 * line sitting directly under the name, plus the place count. A card showing
 * only a photo and a title reads as "a place", and the whole product model
 * collapses back into a destination directory.
 *
 * The muted "Example journey" tag is not decoration: trip data is showcase
 * content while `IS_SHOWCASE` is true, and it has to be visible on each card
 * rather than stated once at the top of a page the user may scroll past.
 */

import { Link } from 'react-router-dom';

import { HERO_IMAGES, tripPlaceCount, tripRouteSummary } from '../../data/showcase';
import { tripPath } from '../../constants/routes';
import SmartImage from '../common/SmartImage';
import Icon from '../common/Icon';
import RouteLine from './RouteLine';

function MetaPill({ children }) {
  return (
    <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700">
      {children}
    </span>
  );
}

export default function TripCard({ trip, priority = 'default' }) {
  if (!trip) return null;

  const isFeature = priority === 'feature';
  const places = tripPlaceCount(trip);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-card transition-shadow duration-200 ease-standard hover:shadow-card-hover ${
        isFeature ? 'sm:col-span-2' : ''
      }`}
    >
      <div className={`relative overflow-hidden ${isFeature ? 'aspect-[16/7]' : 'aspect-[16/10]'}`}>
        <SmartImage
          src={HERO_IMAGES[trip.slug]}
          alt=""
          ratio={null}
          className="h-full w-full object-cover transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-4">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-navy-900">
            {trip.duration}
          </span>
          {trip.seasonShort ? (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {trip.seasonShort}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3
          className={`font-display font-bold tracking-tight text-navy-900 ${
            isFeature ? 'text-2xl sm:text-3xl' : 'text-lg'
          }`}
        >
          {/* Only the title is the link. Making the whole card an anchor gives
              a crawler the entire card text as the link name, which is a poor
              signal for the journey's own name. */}
          <Link
            to={tripPath(trip.slug)}
            className="after:absolute after:inset-0 after:content-[''] hover:text-accent-700"
          >
            {trip.title}
          </Link>
        </h3>

        {/* The journey's spine, always visible. */}
        <div className="mt-3">
          <RouteLine route={trip.route} size="sm" />
        </div>

        <p className="sr-only">Route: {tripRouteSummary(trip)}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <MetaPill>{places} places</MetaPill>
          <MetaPill>{trip.groupSize}</MetaPill>
          {trip.district ? <MetaPill>{trip.district} district</MetaPill> : null}
        </div>

        <p className="measure mt-4 flex-1 text-sm leading-relaxed text-navy-600">{trip.summary}</p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-navy-100 pt-4">
          <span className="text-sm font-semibold text-accent-700">Explore journey</span>
          <Icon name="arrowRight" className="h-4 w-4 flex-none text-accent-700" />
        </div>

        {/* Demo status, on the card itself. */}
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
          Example journey
        </p>
      </div>
    </article>
  );
}
