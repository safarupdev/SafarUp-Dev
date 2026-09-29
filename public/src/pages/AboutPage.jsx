/**
 * About — the product story, told as a narrative.
 *
 * SafarUp plans COMPLETE JOURNEYS: multi-day routes that start somewhere,
 * cross at least one more place, sleep on the way and return. A destination is
 * a stop inside one of those journeys, not a product you buy on its own — and
 * this page is built around that, because the old framing (curated trips plus
 * a destination catalogue) described a different company.
 *
 * Every claim here is grounded in what SafarUp actually is (PRD §1.1, §3.2). It
 * makes no founding story, team-size, award, press, partner, rating, revenue or
 * customer-count claim, because none of those is true yet. Nothing here is
 * invented to make the page read better.
 *
 * This page deliberately does NOT repeat Home's "How SafarUp works" four-card
 * grid, and it is deliberately NOT a card grid itself. Two indexable pages
 * carrying the same four headings and the same sentences are duplicate content
 * that reads as a mistake; Home's version is a product funnel (Discover →
 * Choose → Book → Travel) and this one is prose, in the order a traveller
 * meets it: what a journey is, what we promise about one, how we work, and
 * what is genuinely still being built.
 */

import { useMemo } from 'react';

import { useSeo } from '../lib/seo';
import { joinUrl } from '../lib/format';
import { SITE_URL, organizationNode } from '../constants/site';
import { PATHS } from '../constants/routes';

import Button from '../components/common/Button';
import Icon from '../components/common/Icon';

/**
 * The anatomy of a SafarUp journey — the five things every route has, written
 * out as prose rather than tiles. This is the product definition, so it is
 * stated once, here, in the same words the Journeys and Trip Detail pages use.
 */
const JOURNEY_PARTS = [
  {
    term: 'A route',
    body: 'An ordered path through more than one place, published end to end. Where the journey starts, what it crosses, where it ends. Not a list of nearby attractions — an actual order you can read as a plan.',
  },
  {
    term: 'An overnight',
    body: 'A journey that crosses more than one place sleeps somewhere on the way, so the stay is part of the route rather than something you arrange yourself at the other end.',
  },
  {
    term: 'Places to visit',
    body: 'The individual stops along the way, attributed to the location they belong to. A place is one stop inside a journey — it is not a journey, and it is not bookable on its own.',
  },
  {
    term: 'A return',
    body: 'Every route comes back. Knowing where a journey ends is half of knowing whether it suits you, and it is written on the page before you decide anything.',
  },
  {
    term: 'One vehicle, one plan',
    body: 'The group travels together for the whole route, with the meals, the timings and the logistics planned against the days rather than improvised at each stop.',
  },
];

/**
 * What SafarUp commits to on every journey, in the order a traveller meets it.
 *
 * This is the same data the page's structured data is built from — one array,
 * two renderings — so the markup and the machine-readable list cannot drift.
 */
const JOURNEY_PROMISES = [
  {
    step: 'Nothing is published before somebody has walked it',
    body: 'A destination reaches SafarUp only after a member of the team has been there and written down what is actually on the ground — which temple is open, which road is bad in the monsoon, what a two-day route really costs in hours. The copy on a destination page is somebody’s field notes, not a stock description, and it exists to support a route rather than to sell a place.',
  },
  {
    step: 'The proposal is a document, not a promise',
    body: 'A private journey begins as a written itinerary and quotation. You mark up what is wrong with it. Nothing is charged and nothing is reserved until you accept the version you changed yourself.',
  },
  {
    step: 'One journey, one place to look',
    body: 'Itinerary, pickup point, driver contact, hotel names and documents live in a single journey record. It is the same record the website, the app and our operations team read, so nobody is working from a different version of your route.',
  },
  {
    step: 'We say when a journey will not work',
    body: 'Monsoon, a forest closure, a sanctuary that needs permission on the day, a two-day route that is really four. If the season or the access is wrong for what you want, that is said before you commit — not discovered on the trip.',
  },
];

/** How the work actually gets done, in prose. */
const HOW_WE_WORK = [
  {
    icon: 'compass',
    title: 'Journeys, planned as journeys',
    body: 'We do not publish a place with a price attached and hope a traveller invents a route around it. The route is the thing we design: the order, the overnight, the pace and the return. The places fall out of that, which is why a destination page on this site is context for a journey rather than a shop window.',
  },
  {
    icon: 'route',
    title: 'Private by default',
    body: 'Most SafarUp journeys are private. You give us the dates, the group and the places you care about; we send a written proposal you can change before you accept it. There is no payment and no reservation at the point you enquire.',
  },
  {
    icon: 'landmark',
    title: 'Depth over coverage',
    body: 'We work the districts most travel platforms skip — the temples, the old stone, the sanctuary and the plateau — and we write down the context that makes them worth seeing. A longer, more honest route beats a longer list of stops.',
  },
  {
    icon: 'globe',
    title: 'One source of truth',
    body: 'The same destinations, itinerary and availability are meant to power the website, the mobile app and an API that AI assistants can read. The point is that a machine and a human get the same answer, from the same record, rather than one scraping the other.',
  },
];

/**
 * Technology direction, stated as direction.
 *
 * None of this is built. It is written as a direction with a plain statement
 * that it does not exist yet, because that capability is being built and we are
 * not announcing features that do not exist yet. An aspirational item rendered
 * as a dashed "coming soon" card still reads as a roadmap promise; rendered as
 * a sentence with an explicit "not built" clause, it reads as what it is.
 */
const TECHNOLOGY_DIRECTION = {
  lead: 'The platform underneath a SafarUp journey is meant to be the same platform everything else reads from — the website, a mobile app, and eventually an open API that agents can query instead of scraping a page.',
  items: [
    {
      title: 'AI-assisted discovery',
      body: 'An assistant that understands our actual journeys and destinations, so a recommendation is grounded in a route we really plan rather than a page of similar text. Not built yet.',
    },
    {
      title: 'Saved and compared journeys',
      body: 'A shortlist you can compare side by side and come back to. Not built yet.',
    },
    {
      title: 'Deeper local coverage',
      body: 'More districts, more seasons, and the places between the ones everyone already goes to. This one is content work rather than engineering, and it is ongoing.',
    },
  ],
};

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
         * The items are plain `ListItem`/`Text` rather than `HowToStep`,
         * because `HowToStep` is a `subClassOf` of the retired `HowTo` family —
         * swapping the container while keeping the item type would leave the
         * deprecated vocabulary in the payload.
         */
        '@type': 'ItemList',
        '@id': `${joinUrl(SITE_URL, PATHS.about)}#how-safarup-runs`,
        name: 'How a SafarUp journey runs',
        numberOfItems: JOURNEY_PROMISES.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: JOURNEY_PROMISES.map((promise, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: promise.step,
          text: promise.body,
        })),
      },
    ],
    []
  );

  useSeo({
    title: 'About',
    description:
      'What a SafarUp journey is — a complete multi-day route with a start, an overnight and a return — and what we promise about one.',
    canonical: joinUrl(SITE_URL, PATHS.about),
    structuredData,
  });

  return (
    <>
      <section className="on-dark bg-navy-950 py-20 sm:py-24">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">About SafarUp</p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            We plan complete journeys, not lists of places
          </h1>
          <p className="measure mt-6 text-lg leading-relaxed text-white/85">
            Most travel products hand you a place and leave you to work out the route. SafarUp does
            the opposite: the journey is the thing we design — a multi-day path that starts
            somewhere, crosses at least one more place, sleeps on the way and comes back — and the
            destinations are the stops inside it.
          </p>
          <p className="measure mt-4 text-base leading-relaxed text-white/70">
            That is why a destination page here is a discovery page rather than a shop window. It
            tells you what a place is, what is worth seeing and how to reach it, and then it tells
            you which published journeys already route through it.
          </p>
        </div>
      </section>

      {/*
        The product definition, in prose.

        A `<dl>` rather than tiles: this is a definition, and reading five
        definitions left to right across a grid makes them look like five
        equivalent features rather than five parts of one thing. It is also the
        load-bearing paragraph of the page — everything below it (the promises,
        the way we work, the enquiry) is a consequence of these five parts.
      */}
      <section aria-labelledby="what-safarup-is" className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8">
        <h2 id="what-safarup-is" className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          What a SafarUp journey is
        </h2>
        <p className="measure mt-4 text-base leading-relaxed text-navy-700">
          A SafarUp journey is a complete, multi-day route. It starts somewhere, crosses at least
          one more place, sleeps on the way and comes back. That shape is the product, and it is why
          a destination on this site is a discovery page rather than something you book: the
          destination is one stop inside the journey, and it is the whole route that gets planned,
          paced and priced.
        </p>
        <p className="measure mt-4 text-base leading-relaxed text-navy-700">
          Every journey SafarUp plans has the same five parts. They are published on the journey
          page before anyone enquires, so what you are agreeing to is legible up front.
        </p>

        <dl className="mt-9 max-w-3xl divide-y divide-navy-100 border-y border-navy-100">
          {JOURNEY_PARTS.map((part) => (
            <div key={part.term} className="grid gap-1.5 py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
              <dt className="font-display text-base font-bold text-navy-900">{part.term}</dt>
              <dd className="text-sm leading-relaxed text-navy-600">{part.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/*
        Deliberately prose on a single reading axis, not a four-column grid like
        Home's and not a stack of cards. The two pages answer different
        questions — Home describes the funnel, this describes the promises —
        and reading two indexable pages that look and read the same is worse
        than either page alone.
      */}
      <section aria-labelledby="how-safarup-runs" className="bg-navy-50/70 py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <h2
            id="how-safarup-runs"
            className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
          >
            What we commit to on every journey
          </h2>
          <p className="measure mt-3 text-base leading-relaxed text-navy-600">
            Four promises, in the order a traveller meets them. They hold for a two-day route
            through Jamui and a ten-day journey across Nalanda and Rajgir alike, and they are the
            reason the itineraries read the way they do.
          </p>

          <ol className="mt-9 max-w-3xl space-y-8">
            {JOURNEY_PROMISES.map((promise, index) => (
              <li key={promise.step} className="relative pl-14 sm:pl-16">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 font-display text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="font-display text-lg font-bold tracking-tight text-navy-900">
                  {promise.step}
                </h3>
                <p className="mt-2 measure text-[0.95rem] leading-relaxed text-navy-600">
                  {promise.body}
                </p>
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
          How we work
        </h2>
        <p className="measure mt-3 text-base leading-relaxed text-navy-600">
          Four things that follow from taking the journey, rather than the place, as the unit of
          work.
        </p>

        <ul className="mt-9 max-w-3xl space-y-7">
          {HOW_WE_WORK.map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-navy-900 text-white">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-navy-900">{item.title}</h3>
                <p className="measure mt-1.5 text-[0.95rem] leading-relaxed text-navy-600">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Technology direction, in sentences.

        The old version rendered these as dashed "coming soon" cards, which
        still reads as a roadmap commitment once a visitor has scrolled. Prose
        with the state stated in the sentence — "Not built yet." — is the
        honest form: the capability is being built and we are not announcing
        features that do not exist yet. Nothing here claims a partnership, a
        launch date or a shipped feature.
      */}
      <section aria-labelledby="technology" className="mx-auto max-w-shell px-4 pb-16 sm:px-6 lg:px-8">
        <h2
          id="technology"
          className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl"
        >
          The technology behind it, honestly
        </h2>
        <p className="measure mt-3 text-base leading-relaxed text-navy-600">
          {TECHNOLOGY_DIRECTION.lead}
        </p>
        <p className="measure mt-4 flex items-start gap-2 text-sm leading-relaxed text-navy-500">
          <Icon name="info" className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            None of the following is a shipped feature. This capability is being built, and we are
            not announcing features that do not exist yet — so if you are looking for it today, it
            is not there.
          </span>
        </p>
        <dl className="mt-8 max-w-3xl space-y-6">
          {TECHNOLOGY_DIRECTION.items.map((item) => (
            <div key={item.title} className="border-l-2 border-navy-100 pl-5">
              <dt className="font-bold text-navy-900">{item.title}</dt>
              <dd className="measure mt-1.5 text-[0.95rem] leading-relaxed text-navy-600">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="on-dark bg-navy-900 py-16">
        <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Read a whole journey before you decide
            </h2>
            <p className="measure mt-3 text-base leading-relaxed text-white/80">
              Every itinerary is published end to end — the route, the places, the nights and the
              return — before you tell us anything. When you are ready, tell us your dates and who is
              travelling, and we will plan it around you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button as="link" to={PATHS.trips} size="lg">
              Explore journeys
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
