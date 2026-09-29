/**
 * Trips — showcase trip discovery (PRD §19, §20).
 *
 * `tripTemplates` does not exist in the backend yet, so there is no live trip
 * data. This page presents the **trip experience** from clearly-labelled
 * showcase content (`data/showcase.js`) and says so on the page. It never
 * implies a departure, a date, a price or availability.
 */

import { useMemo } from 'react';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL } from '../constants/site';
import { PATHS } from '../constants/routes';
import { HERO_IMAGES, IS_SHOWCASE, SHOWCASE_NOTICE, SHOWCASE_TRIPS } from '../data/showcase';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Icon from '../components/common/Icon';

/**
 * The listing itself is not an entity and has no photograph of its own, so the
 * first card's hero stands in for the share card. Anything better would be
 * page-level art that does not exist yet; falling back to the site default was
 * the previous behaviour and it meant `/trips` unfurled as the generic site
 * card while the page it describes was entirely photographs. Revisit when real
 * trip photography ships with the TripTemplate API.
 */
const SHARE_IMAGE = HERO_IMAGES[SHOWCASE_TRIPS[0].slug] ?? null;

export default function TripsPage() {
  /**
   * The listing is a set of showcase trips, not live TripTemplate inventory.
   * Listing each one as a `TouristTrip` with a `url` tells a crawler and an
   * answer engine that SafarUp operates these departures — which is exactly
   * what the page's own notice says it cannot. Suppressed while
   * `IS_SHOWCASE`; the page stays public, linked and fully navigable.
   */
  const structuredData = useMemo(
    () =>
      IS_SHOWCASE
        ? []
        : [
            {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'SafarUp group trips',
              itemListElement: SHOWCASE_TRIPS.map((trip, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'TouristTrip',
                  name: trip.title,
                  description: trip.summary,
                  url: joinUrl(SITE_URL, PATHS.trips, trip.slug),
                },
              })),
            },
          ],
    []
  );

  useSeo({
    title: 'Group Trips',
    description:
      'Curated group departures across Bihar and beyond — temples, heritage, hills and wildlife, planned by travellers.',
    canonical: joinUrl(SITE_URL, PATHS.trips),
    // The page used to render hero photography while advertising the generic
    // site share card. Real image, same map the cards render from.
    image: SHARE_IMAGE,
    robots: IS_SHOWCASE ? 'noindex,follow' : null,
    structuredData,
  });

  return (
    <>
      <section className="bg-navy-950 py-16 sm:py-20">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
            Group trips
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Curated departures, built by people who have travelled the route
          </h1>
          <p className="measure mt-5 text-lg leading-relaxed text-white/80">
            Fixed dates, small groups, and an itinerary you can read in full before you decide.
          </p>
        </div>
      </section>

      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-shell items-start gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Icon name="info" className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="font-semibold">{SHOWCASE_NOTICE.title}.</strong>{' '}
            {SHOWCASE_NOTICE.body}
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-shell px-4 py-14 sm:px-6 lg:px-8">
        <ul className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
{SHOWCASE_TRIPS.map((trip) => (
            // `group` stays on the list item so the image zoom is still driven
            // by the whole card's hover target.
            <li key={trip.slug} className="group">
              <Card
                as="link"
                to={joinUrl(PATHS.trips, trip.slug)}
                hover
                pad="none"
                className="overflow-hidden"
              >
                <div className="aspect-[16/10] overflow-hidden bg-navy-100">
                  <img
                    src={HERO_IMAGES[trip.slug]}
                    // Decorative. These are stock stand-ins, not photographs of
                    // this route, so describing them as "<district> landscape"
                    // would be an alt-text claim that is not true. The card's
                    // link text is the trip title directly beneath.
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-standard group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                      {trip.duration}
                    </span>
                    <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                      {trip.season}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-navy-900">
                    {trip.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{trip.subtitle}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-navy-600">
                    {trip.summary}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    View itinerary
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-2xl bg-navy-50/70 p-8 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-navy-900">
            Want one of these routes as a private trip?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-navy-600">
            Most SafarUp journeys are private trips built around your dates and your group. Tell us
            the route you have in mind.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button as="link" to={PATHS.planTrip}>
              Plan a Private Trip
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            <Button as="link" to={PATHS.destinations} variant="secondary">
              Browse destinations
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
