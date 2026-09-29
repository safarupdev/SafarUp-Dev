/**
 * About — the product and company story.
 *
 * Every claim here is grounded in what SafarUp actually is: a digital travel
 * company selling curated group departures and fully customised private trips
 * (PRD §1.1, §3.2). It makes no revenue, customer-count or award claims,
 * because none are true yet.
 *
 * This page deliberately does NOT repeat Home's "How SafarUp works" four-card
 * grid. Two indexable pages carrying the same four headings and the same
 * sentences are duplicate content that reads as a mistake; Home's version is a
 * product funnel (Discover → Choose → Book → Travel) and this one is a set of
 * commitments the company makes about a trip, laid out as a vertical
 * timeline rather than a row of cards.
 */

import { useMemo } from 'react';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL, organizationNode } from '../constants/site';
import { PATHS } from '../constants/routes';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Icon from '../components/common/Icon';

const PILLARS = [
  {
    icon: 'compass',
    title: 'Curated group trips',
    body: 'Fixed dates, fixed itineraries, small groups. You read the whole plan before you join, and you know exactly who you are travelling with.',
  },
  {
    icon: 'route',
    title: 'Private trips, built properly',
    body: 'Most SafarUp journeys are private. You give us the dates, the group and the places; we send a proposal you can change before you accept it.',
  },
  {
    icon: 'landmark',
    title: 'Local depth',
    body: 'We work the districts most travel platforms skip — the temples, the stone, the sanctuary and the plateau, with the context that makes them worth seeing.',
  },
  {
    icon: 'globe',
    title: 'One platform, every client',
    body: 'The same destinations, itinerary and availability power the website, the mobile app and the API our AI partners read. One source of truth.',
  },
];

/**
 * What SafarUp commits to on every trip, in the order a traveller meets it.
 *
 * This is the same data the page's structured data is built from — one array,
 * two renderings — so the markup and the machine-readable list cannot drift.
 */
const TRIP_PROMISES = [
  {
    step: 'Nothing is listed before somebody has walked it',
    body: 'A destination reaches SafarUp only after a member of the team has been there and written down what is actually on the ground — which temple is open, which road is bad in the monsoon, what a two-day route really costs in hours. The copy on a destination page is somebody’s field notes, not a stock description.',
  },
  {
    step: 'The proposal is a document, not a promise',
    body: 'A private trip begins as a written itinerary and quotation. You mark up what is wrong with it. Nothing is charged and nothing is reserved until you accept the version you changed yourself.',
  },
  {
    step: 'One trip, one place to look',
    body: 'Itinerary, pickup point, driver contact, hotel names and documents live in a single trip record. It is the same record the website, the app and our operations team read, so nobody is working from a different version of your trip.',
  },
  {
    step: 'We say when a trip will not work',
    body: 'Monsoon, a forest closure, a sanctuary that needs permission on the day, a two-day route that is really four. If the season or the access is wrong for what you want, that is said before you commit — not discovered on the trip.',
  },
];

const LOOKING_AHEAD = [
  {
    icon: 'sparkle',
    title: 'AI-assisted discovery',
    body: 'A SafarUp agent that understands our actual destinations and departures, so recommendations are grounded in what we really run.',
  },
  {
    icon: 'inbox',
    title: 'Saved and compared trips',
    body: 'Keep a shortlist, compare side by side, and pick up your planning where you left it.',
  },
  {
    icon: 'train',
    title: 'Deeper local coverage',
    body: 'More districts, more seasons, and the places between the ones everyone already goes to.',
  },
];

export default function AboutPage() {
  const structuredData = useMemo(
    () => [
      organizationNode(),
      {
        '@context': 'https://schema.org',
        /**
         * This used to be `HowItWorks`. Google withdrew HowTo rich results, so
         * that markup now describes a carousel the site can never receive —
         * a claim with nothing behind it.
         *
         * An `ItemList` is the honest replacement: it states exactly what is
         * on the page (four commitments, in order) and asks for no rich result.
         * `HowToStep` is retained as the *item* type because it is ordinary,
         * current schema.org vocabulary describing a single step — not the
         * retired `HowItWorks` container.
         */
        '@type': 'ItemList',
        '@id': joinUrl(SITE_URL, PATHS.about, '#how-safarup-runs'),
        name: 'How a SafarUp trip runs',
        numberOfItems: TRIP_PROMISES.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: TRIP_PROMISES.map((promise, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'HowToStep',
            name: promise.step,
            text: promise.body,
          },
        })),
      },
    ],
    []
  );

  useSeo({
    title: 'About',
    description:
      'SafarUp is a digital-first travel company: curated group departures and fully customised private trips, planned by travellers and managed from booking to departure.',
    canonical: joinUrl(SITE_URL, PATHS.about),
    structuredData,
  });

  return (
    <>
      <section className="bg-navy-950 py-20 sm:py-24">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">About SafarUp</p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            A travel company built by the people who plan the route
          </h1>
          <p className="measure mt-6 text-lg leading-relaxed text-white/85">
            SafarUp makes organised travel discoverable, bookable and manageable online — whether
            that is a fixed group departure or a private trip built from scratch.
          </p>
        </div>
      </section>

      <section aria-labelledby="what-safarup-is" className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8">
        <h2 id="what-safarup-is" className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          What SafarUp is
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Card pad="lg">
            <h3 className="font-display text-lg font-bold text-navy-900">Group trips</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              Fixed destination, fixed dates, a fixed itinerary and a defined price. You pick the
              departure that suits you and book the seats that are open. Everything about the trip is
              on the page before you commit.
            </p>
          </Card>
          <Card pad="lg">
            <h3 className="font-display text-lg font-bold text-navy-900">Private trips</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              You tell us the dates, the people and the places. Our operations team prepares a
              tailored itinerary and quotation, you review it digitally, change what you like, and
              only then does anything get confirmed.
            </p>
          </Card>
        </div>
      </section>

      {/*
        Deliberately a vertical timeline, not a four-column grid like Home's.
        The two pages answer different questions — Home describes the funnel,
        this describes the promises — and reading two indexable pages that
        look and read the same is worse than either page alone.
      */}
      <section aria-labelledby="how-safarup-runs" className="bg-navy-50/70 py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <h2
            id="how-safarup-runs"
            className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
          >
            What we commit to, in order
          </h2>
          <p className="measure mt-3 text-base leading-relaxed text-navy-600">
            Four promises that hold for a two-day group departure and a ten-day private journey
            alike. They are the reason the itineraries read the way they do.
          </p>

          <ol className="mt-9 space-y-4">
            {TRIP_PROMISES.map((promise, index) => (
              <li key={promise.step} className="relative pl-14 sm:pl-16">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 font-display text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <Card variant="outline" pad="lg">
                  <h3 className="font-display text-lg font-bold text-navy-900">{promise.step}</h3>
                  <p className="mt-2 measure text-sm leading-relaxed text-navy-600">
                    {promise.body}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="what-we-stand-for" className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8">
        <h2
          id="what-we-stand-for"
          className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
        >
          What we stand for
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <Card as="li" key={pillar.title} pad="lg" className="flex gap-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-navy-900 text-white">
                <Icon name={pillar.icon} className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-navy-900">{pillar.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{pillar.body}</p>
              </div>
            </Card>
          ))}
        </ul>
      </section>

      <section aria-labelledby="looking-ahead" className="mx-auto max-w-shell px-4 pb-16 sm:px-6 lg:px-8">
        <h2
          id="looking-ahead"
          className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
        >
          Where SafarUp is going
        </h2>
        <p className="mt-3 measure text-base leading-relaxed text-navy-600">
          The same platform that serves this website will serve a mobile app and an open API, so
          travel agents and AI assistants can work with real SafarUp inventory rather than
          scraping a page.
        </p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-3">
          {LOOKING_AHEAD.map((item) => (
            // `inset`: dashed reads as provisional. None of these are built
            // yet, and the class must never drift onto a real feature.
            <Card as="li" key={item.title} variant="inset" pad="lg">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{item.body}</p>
            </Card>
          ))}
        </ul>
      </section>

      <section className="bg-navy-900 py-16">
        <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to travel differently?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              Start with a destination we have already prepared, or tell us the trip you have in
              mind.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
    </>
  );
}
