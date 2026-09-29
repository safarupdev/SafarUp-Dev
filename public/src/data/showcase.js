/**
 * SHOWCASE DATA — presentation content, NOT production inventory.
 *
 * ====================================================================
 *  READ THIS BEFORE USING ANYTHING IN THIS FILE
 * ====================================================================
 *
 * The `tripTemplates`, `departures`, `bookings` and `payments` domains do not
 * exist in the backend yet (PRD §51.1 — all Planned/Phase 3, Phase 4 and
 * Phase 5). There is therefore no live trip data, and none is invented here.
 *
 * What this file contains is **presentation content for the Trip Detail
 * experience** (PRD §185–§194). It demonstrates the approved structured trip
 * architecture — identity, pickup/drop, an order-preserving day-wise
 * itinerary, places covered, inclusions/exclusions, vehicle, accommodation,
 * meals, seasonality and important information.
 *
 * Rules this file obeys, and that the UI depends on:
 *
 *   1. **Destinations, districts, categories and places are NOT here.** Those
 *      are real, live entities read from the API. Mixing fake taxonomy into
 *      live data would corrupt the discovery experience. The one exception is
 *      `destinationSlug`, which is a *reference* to a real published
 *      destination (verified against `GET /destinations`, see below) — it
 *      names nothing that does not exist.
 *   2. **No departure dates, no seat counts, no prices, no availability.**
 *      A price or a date here would read as bookable inventory, which it is
 *      not. `IS_SHOWCASE` is what the UI and the document head actually key
 *      off, so bookability is stated once, there, rather than as a
 *      `isBookable: false` on every entry that nothing reads.
 *   3. **No booking, payment or confirmation state is implied anywhere.**
 *   4. The structural pattern is modelled on the Jamui–Simultala reference
 *      trip (PRD §3, the canonical content pattern). The *shape* is the point;
 *      the place names used are real Bihar attractions so the page reads as a
 *      real product, and every trip is labelled as showcase content wherever
 *      it is displayed.
 *
 * When TripTemplate APIs land (Phase 3), this file is deleted and the pages
 * switch to `api/trips.api.js`. It must never grow a second role.
 */

/** Rendered as a visible banner on every trip surface. */
export const SHOWCASE_NOTICE = {
  title: 'Showcase content',
  body:
    'Trip itineraries on SafarUp are still being published. These pages show the trip experience we are building — departures, dates and prices are not yet live, so nothing here can be booked yet.',
};

export const IS_SHOWCASE = true;

/**
 * Hero image per trip, hoisted here so the list and the detail page cannot
 * drift. Two identical maps used to live in `pages/TripsPage.jsx` and
 * `pages/TripDetailPage.jsx` at different widths; one map is now the only
 * copy, and `useSeo({ image })` on both pages reads it — a page that renders
 * an image but advertises a different one (or none) in its Open Graph card is
 * a link that unfurls as a blank box.
 *
 * These are stock images standing in for trip photography. They are real,
 * fetchable URLs, but they are NOT photographs of these routes; they are
 * replaced when the TripTemplate API supplies media.
 */
export const HERO_IMAGES = {
  'jamui-simultala-explorer':
    'https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1920&q=70',
  'bodh-gaya-mahabodhi-circuit':
    'https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1920&q=70',
  'nalanda-ruins-and-sites':
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1920&q=70',
};

/**
 * Trip content. `placeIds` deliberately omitted — trips will reference the
 * canonical Place entities by ID once the Trip API exists. `placeNames` is
 * display text for the showcase only, and is labelled as such in the UI.
 *
 * `destinationSlug` is the ONLY link this file makes into live data, and it is
 * strictly one-directional: a trip points at a destination, never the reverse.
 * A link is asserted only where the referenced slug is a destination the API
 * actually serves (see `SHOWCASE_TRIPS`); `null` means "we have no published
 * destination for this district", and the UI then shows nothing rather than a
 * guess. `destinationName` is the display mirror of that destination's
 * published `name`, present only alongside a non-null `destinationSlug`.
 */
export const SHOWCASE_TRIPS = [
  {
    slug: 'jamui-simultala-explorer',
    title: 'Jamui – Simultala Explorer',
    subtitle: 'Temples, heritage, hills and winter wildlife across Jamui',
    /**
     * `null` — verified 2026-09-29 against `GET /api/destinations`: the
     * published set is rohtas, vaishali, bodh-gaya, rajgir, nalanda. There is
     * no Jamui destination, so there is nothing real to link to and the trip
     * page links to the destinations index instead of inventing a slug.
     */
    destinationSlug: null,
    district: 'Jamui',
    duration: '2 Days / 1 Night',
    /**
     * The journey-first shape (PRD open decision: Trip Detail field contract).
     * A Trip is a COMPLETE journey, not a destination. `route` is the
     * ordered spine the UI visualises; `role` drives the marker treatment
     * and must be 'start' | 'stop' | 'overnight' | 'return'. Derived from
     * the day's own start/end locations below, so route and itinerary can
     * never disagree.
     */
    nights: 1,
    route: [
      { name: 'Jamui', role: 'start' },
      { name: 'Simultala', role: 'overnight' },
      { name: 'Jamui', role: 'return' },
    ],
    season: 'October – February',
    seasonShort: 'Oct – Feb',
    groupSize: 'Small group',
    tripType: 'Heritage & Nature',
    summary:
      'Explore the temples, heritage, hills, forests, local culture and winter wildlife of Jamui with SafarUp.',
    overview:
      'Two days through one of Bihar’s least-visited districts. Day one moves between Jamui’s working temples and the old stone of the Gidhaur tower before climbing to Simultala for the night. Day two is spent in the sanctuary country around Lattu Pahar and the Nagi-Nakti bird sanctuary, where winter arrivals bring migratory birds onto the plateau.',
    highlights: [
      'Patneswar Mandir, one of Bihar’s oldest continuously worshipped shrines',
      'Minto Tower at Gidhaur, standing above the town since the 16th century',
      'A night on the Simultala plateau, inside the forest reserve',
      'Nagi-Nakti bird sanctuary in winter migration season',
      'Maa Netula Temple, where the goddess is carried in procession each Shravani',
    ],
    historicalContext: {
      heading: 'History & culture of the Jamui belt',
      body: 'Jamui sits where the Ganges plain gives way to the Kaimur hills, and the district has long been a meeting point of two very different landscapes. The temples around Jamui and Gidhaur reflect that position: many are built in stone from the 16th and 17th centuries, several still follow older local traditions of chariot procession rather than the later northern Indian temple pattern. Simultala, by contrast, is a 20th-century development — a hill station established in the forest reserve, and now principally known as a wintering site for migratory birds.',
    },
    pickupDrop: {
      pickupLocations: ['Jamui Bus Stand, Jamui', 'Jamui Railway Station'],
      pickupInstructions:
        'Pickup is from a single meeting point per location. Your exact pickup time and contact number are shared with the group before departure.',
      dropInstructions: 'Drop is at the same Jamui points at the end of Day 2.',
      coordinationNotes:
        'The group travels together in one vehicle throughout. Points are collected in order, so an early pickup means an early start.',
    },
    itinerary: [
      {
        day: 1,
        title: 'Jamui temples and the climb to Simultala',
        summary: 'The working temples of the Jamui plains, then west to the Gidhaur tower and up to the plateau.',
        startLocation: 'Jamui',
        endLocation: 'Simultala',
        overnight: true,
        meals: ['Lunch', 'Dinner'],
        stops: [
          { name: 'Jamui', description: 'Departure point. Orientation and pickup.' },
          { name: 'Patneswar Mandir', description: 'Morning visit to the district’s principal shrine.' },
          { name: 'Maa Netula Temple', description: 'A hilltop temple associated with the annual Shravani procession.' },
          { name: 'Jain Mandir, Lachhuar', description: 'Short stop on the road west.' },
          { name: 'Giddheswar Temple', description: 'Temple complex near the Gidhaur turn.' },
          { name: 'Kali Mandir, Malaypur', description: 'Brief stop en route.' },
          { name: 'Minto Tower, Gidhaur', description: 'The stone tower overlooking Gidhaur.' },
          { name: 'Mahaveer Vatika', description: 'Open-air temple garden.' },
          { name: 'Simultala', description: 'Evening arrival and overnight on the plateau.', overnight: true },
        ],
      },
      {
        day: 2,
        title: 'Plateau, sanctuary and return',
        summary: 'Early start on the plateau, the bird sanctuary, and the return to Jamui.',
        startLocation: 'Simultala',
        endLocation: 'Jamui',
        overnight: false,
        meals: ['Breakfast', 'Lunch'],
        stops: [
          { name: 'Simultala', description: 'Dawn on the plateau, before the forest fog lifts.' },
          { name: 'Lattu Pahar', description: 'The high point of the reserve and the best view over the range.' },
          { name: 'Nagi-Nakti Bird Sanctuary', description: 'Winter migratory habitat. Sightings are seasonal and cannot be promised.' },
          { name: 'Bhim Bandh', description: 'Picnic and rest point on the way down.' },
          { name: 'Jamui', description: 'Return and drop.' },
        ],
      },
    ],
    placesCovered: [
      { name: 'Patneswar Mandir', category: 'Spiritual & Cultural' },
      { name: 'Maa Netula Temple', category: 'Spiritual & Cultural' },
      { name: 'Minto Tower, Gidhaur', category: 'Heritage' },
      { name: 'Simultala', category: 'Hills & Nature' },
      { name: 'Lattu Pahar', category: 'Hills & Nature' },
      { name: 'Nagi-Nakti Bird Sanctuary', category: 'Wildlife & Seasonal' },
    ],
    inclusions: [
      'Pickup from Jamui and drop back to Jamui',
      'Transportation for the full two days',
      'Vehicle with driver',
      'Accommodation — 1 night on the Simultala plateau',
      'Breakfast and lunch on Day 2, lunch and dinner on Day 1',
      'Trip coordination throughout',
      'Planned sightseeing as described in the itinerary',
    ],
    exclusions: [
      'Entry fees and temple donations',
      'Personal expenses',
      'Shopping',
      'Additional food and beverages',
      'Personal itinerary changes',
      'Medical and emergency expenses',
      'Any service not listed under inclusions',
    ],
    vehicle: {
      policy: 'Vehicle is assigned by group size on the day.',
      possibilities: ['Tempo Traveller', 'Toyota Innova Crysta', 'Bolero'],
      comfortNote:
        'A 2-day route on state and forest roads. Higher seating and air conditioning are prioritised when the group size allows.',
      routeNote: 'Ghat sections on the climb to Simultala are slow. Day timings allow for this.',
    },
    accommodation: {
      policy:
        'Accommodation is confirmed per departure and may differ from the property shown in the itinerary.',
      criteria: 'Clean, warm rooms with hot water, within reach of the plateau road.',
      groupNote: 'Rooms are allocated by the operator based on availability and group size.',
    },
    bestTimeToTravel:
      'October to February. The sanctuary is a winter habitat and the plateau is cold and clearest after the monsoon. The route is not run through the peak monsoon.',
    importantInformation: [
      { label: 'Weather dependency', body: 'Winter mornings on the plateau are cold and can be foggy. Layered clothing is essential.' },
      { label: 'Road conditions', body: 'The final climb is a hill road. Journey time each way is around three hours.' },
      { label: 'Site availability', body: 'The bird sanctuary is managed by forest authorities. Access depends on their permission on the day.' },
      { label: 'Wildlife viewing limitations', body: 'Migratory birds are wild animals. Sightings cannot be guaranteed and should not influence how the day is planned.' },
      { label: 'Guest responsibilities', body: 'Forest reserve rules apply throughout — no littering, no plastic, no fire outside designated areas.' },
      { label: 'Personal safety', body: 'Stay on marked paths on the plateau, particularly at dawn and dusk.' },
      { label: 'Belongings', body: 'You are responsible for your own belongings, including cameras and binoculars.' },
    ],
  },
  {
    slug: 'bodh-gaya-mahabodhi-circuit',
    title: 'Bodh Gaya Mahabodhi Circuit',
    subtitle: 'The sacred grove, the Diamond Triangle and Bodh Gaya by night',
    /**
     * `bodh-gaya` — a real PUBLISHED destination in the Gaya district, verified
     * 2026-09-29 against `GET /api/destinations`. It is the trip's own
     * destination, not a district-level guess.
     */
    destinationSlug: 'bodh-gaya',
    /**
     * Display mirror of the published destination's `name`, read from the
     * same `GET /destinations` response that proved the slug exists. It is
     * NOT an independent claim — if the destination is renamed in the CMS,
     * this string must be updated with it, or the link will read wrong.
     */
    destinationName: 'Bodh Gaya',
    district: 'Gaya',
    duration: '2 Days / 1 Night',
    nights: 1,
    route: [
      { name: 'Gaya', role: 'start' },
      { name: 'Bodh Gaya', role: 'overnight' },
      { name: 'Gaya', role: 'return' },
    ],
    season: 'October – March',
    seasonShort: 'Oct – Mar',
    groupSize: 'Small group',
    tripType: 'Spiritual & Cultural',
    summary:
      'The Mahabodhi Temple at Bodh Gaya, the Diamond Triangle of nearby sites, and Gaya itself — a circuit built around one of the world’s most significant Buddhist sites.',
    overview:
      'Bodh Gaya is the single most visited Buddhist site in the world outside the four main pilgrimage centres, and it rewards more than a stop at the temple. This circuit takes in the Mahabodhi complex, the nearby Diamond Triangle sites, and Gaya, staying overnight in Bodh Gaya so the morning at the temple happens before the crowds.',
    highlights: [
      'Mahabodhi Temple complex, a UNESCO World Heritage Site',
      'The Diamond Triangle: Dungeshwari, Bakraur and Bodh Gaya',
      'Dungeshwari Caves, traditionally the place of the enlightenment discourse',
      'Gaya and the Dakshina Kalika footprint',
      'Evening aarti on the temple side',
    ],
    historicalContext: {
      heading: 'Where the Buddha is held to have awakened',
      body: 'The Mahabodhi Temple marks the site where Siddhartha Gautama is held to have attained enlightenment beneath the Bodhi tree. The present structure, built around the 5th and 6th centuries under the Gupta period, stands on a site of continuous Buddhist significance for far longer. The Diamond Triangle nearby links Bodh Gaya to the caves at Dungeshwari and the river crossing at Bakraur, a set of locations central to the earliest Buddhist accounts.',
    },
    pickupDrop: {
      pickupLocations: ['Gaya Bus Stand, Gaya', 'Gaya Railway Station'],
      pickupInstructions: 'Single meeting point per location. Details shared with the group before departure.',
      dropInstructions: 'Drop back at the Gaya points at the end of Day 2.',
      coordinationNotes: 'The circuit visits three separate sites. Early starts are necessary to avoid heat and crowds.',
    },
    itinerary: [
      {
        day: 1,
        title: 'Gaya to the Diamond Triangle',
        summary: 'The Dungeshwari caves and Bakraur, then on to Bodh Gaya.',
        startLocation: 'Gaya',
        endLocation: 'Bodh Gaya',
        overnight: true,
        meals: ['Lunch', 'Dinner'],
        stops: [
          { name: 'Gaya', description: 'Departure and brief orientation.' },
          { name: 'Dungeshwari Caves', description: 'The cave complex traditionally associated with the enlightenment discourse.' },
          { name: 'Bakraur', description: 'The river crossing on the Diamond Triangle.' },
          { name: 'Bodh Gaya', description: 'Arrival, temple visit and overnight.' },
        ],
      },
      {
        day: 2,
        title: 'Mahabodhi at dawn and return',
        summary: 'The temple before the crowds, then back to Gaya.',
        startLocation: 'Bodh Gaya',
        endLocation: 'Gaya',
        overnight: false,
        meals: ['Breakfast', 'Lunch'],
        stops: [
          { name: 'Mahabodhi Temple', description: 'Early visit, well before the main crowd.' },
          { name: '80-foot Buddha', description: 'The great standing figure on the temple approach.' },
          { name: 'Gaya', description: 'Return and drop.' },
        ],
      },
    ],
    placesCovered: [
      { name: 'Mahabodhi Temple', category: 'Spiritual & Cultural' },
      { name: 'Dungeshwari Caves', category: 'Heritage' },
      { name: 'Bakraur', category: 'Heritage' },
      { name: '80-foot Buddha', category: 'Spiritual & Cultural' },
    ],
    inclusions: [
      'Pickup and drop in Gaya',
      'Transportation for both days',
      'Accommodation — 1 night at Bodh Gaya',
      'Breakfast and lunch on Day 2, lunch and dinner on Day 1',
      'Trip coordination',
      'Planned sightseeing as described',
    ],
    exclusions: [
      'Temple entry fees',
      'Donations and offerings',
      'Personal expenses',
      'Shopping',
      'Additional food and beverages',
      'Medical and emergency expenses',
      'Any service not listed under inclusions',
    ],
    vehicle: {
      policy: 'Vehicle is assigned by group size on the day.',
      possibilities: ['Toyota Innova Crysta', 'Bolero', 'Swift Dzire'],
      comfortNote: 'Flat driving on good highway. Air conditioning matters in the warmer months.',
      routeNote: 'Bodh Gaya to Dungeshwari is about 25 km each way.',
    },
    accommodation: {
      policy: 'Confirmed per departure; the property may differ from what is shown.',
      criteria: 'Close to the temple approach, clean, with early breakfast available.',
      groupNote: 'Rooms allocated by the operator based on availability.',
    },
    bestTimeToTravel:
      'October to March. Winters are mild and clear. The site is busiest around the Buddhist calendar dates.',
    importantInformation: [
      { label: 'Site etiquette', body: 'Mahabodhi Temple requires modest dress. Shoulders and knees are covered.' },
      { label: 'Early starts', body: 'The morning visit is deliberately early to see the temple before the main crowd.' },
      { label: 'Footwear', body: 'Shoes and leather items are removed at the temple. Carry socks for the walk back.' },
      { label: 'Personal belongings', body: 'You are responsible for your own belongings on temple approaches, which are busy.' },
    ],
  },
  {
    slug: 'nalanda-ruins-and-sites',
    title: 'Nalanda Ruins & Ancient Sites',
    subtitle: 'The monastic university, the Bodhi tree and Rajgir',
    /**
     * `nalanda` — a real PUBLISHED destination in the Nalanda district, verified
     * 2026-09-29 against `GET /api/destinations`. The trip also passes through
     * Rajgir, but `nalanda` is its named destination, so that is the one link
     * asserted; adding a second would imply a relationship the data does not
     * state.
     */
    destinationSlug: 'nalanda',
    destinationName: 'Nalanda',
    district: 'Nalanda',
    duration: '3 Days / 2 Nights',
    nights: 2,
    route: [
      { name: 'Rajgir', role: 'start' },
      { name: 'Nalanda', role: 'overnight' },
      { name: 'Rajgir', role: 'return' },
    ],
    season: 'September – March',
    seasonShort: 'Sep – Mar',
    groupSize: 'Small group',
    tripType: 'Heritage',
    summary:
      'Three days across the Nalanda and Rajgir corridor — one of the most important monastic sites in the world, plus the hot springs and hill complexes around Rajgir.',
    overview:
      'Nalanda was a monastic university drawing students across Asia for several centuries, and the excavated site is only a fraction of what once stood. This trip gives Nalanda the time it deserves, then continues south to Rajgir for the hot springs, the Gridhakuta hill and the Gridhakuta caves.',
    highlights: [
      'The excavated Nalanda monastic complex',
      'The Surajkund and Sariputta stupa sites',
      'Rajgir hot springs',
      'Gridhakuta hill and the Jivakambhuji shrine',
      'Bihar Museum, for the excavated Buddhist art',
    ],
    historicalContext: {
      heading: 'A university that changed a continent',
      body: 'Nalanda is conventionally described as a monastic university, and it functioned as one: a large residential institution where monks studied logic, medicine, astronomy and mathematics alongside Buddhist doctrine, attracting learners from across Asia. What survives is the excavated brick core of the complex, several of the temple and stupa sites, and the famous Sariputta stupa. Nearby Rajgir was a significant early Buddhist centre, associated with both the Buddha and later Buddhist teachers.',
    },
    pickupDrop: {
      pickupLocations: ['Rajgir Bus Stand', 'Nalanda Bus Stand'],
      pickupInstructions: 'Pickup depends on where the group is staying. Confirmed per departure.',
      dropInstructions: 'Drop at the departure point at the end of Day 3.',
      coordinationNotes: 'Three days across two districts, with a night at Nalanda and a night at Rajgir.',
    },
    itinerary: [
      {
        day: 1,
        title: 'Rajgir and the hot springs',
        summary: 'Arrival, Rajgir hot springs and the Gridhakuta hill complex.',
        startLocation: 'Rajgir',
        endLocation: 'Rajgir',
        overnight: true,
        meals: ['Lunch', 'Dinner'],
        stops: [
          { name: 'Rajgir', description: 'Arrival and check-in.' },
          { name: 'Hot Springs, Rajgir', description: 'Thermal springs at the foot of the hills.' },
          { name: 'Gridhakuta Hill', description: 'The hill associated with the Jivakambhuji shrine.' },
          { name: 'Gridhakuta Caves', description: 'Rock-cut chambers below the hill.' },
        ],
      },
      {
        day: 2,
        title: 'Rajgir to Nalanda',
        summary: 'The Jivakambhuji steps and the Bihar Museum, then on to Nalanda.',
        startLocation: 'Rajgir',
        endLocation: 'Nalanda',
        overnight: true,
        meals: ['Breakfast', 'Lunch', 'Dinner'],
        stops: [
          { name: 'Jivakambhuji Temple', description: 'The summit temple reached by the stone steps.' },
          { name: 'Bihar Museum, Nalanda', description: 'Excavated Buddhist sculpture and a well-known Chinese pilgrim egg.' },
          { name: 'Nalanda', description: 'Arrival and overnight.' },
        ],
      },
      {
        day: 3,
        title: 'The Nalanda monastic complex',
        summary: 'The excavated university, the stupas and departure.',
        startLocation: 'Nalanda',
        endLocation: 'Rajgir',
        overnight: false,
        meals: ['Breakfast', 'Lunch'],
        stops: [
          { name: 'Nalanda Excavations', description: 'Temple complexes, monasteries and the main stupa.' },
          { name: 'Sariputta Stupa', description: 'Named for the monk credited with the site’s earliest structures.' },
          { name: 'Surajkund', description: 'The bathing tank complex.' },
          { name: 'Rajgir', description: 'Return and drop.' },
        ],
      },
    ],
    placesCovered: [
      { name: 'Nalanda Excavations', category: 'Heritage' },
      { name: 'Sariputta Stupa', category: 'Heritage' },
      { name: 'Hot Springs, Rajgir', category: 'Hills & Nature' },
      { name: 'Jivakambhuji Temple', category: 'Spiritual & Cultural' },
      { name: 'Bihar Museum', category: 'Heritage' },
    ],
    inclusions: [
      'Pickup and drop',
      'Transportation across three days',
      'Accommodation — 2 nights, 1 at Rajgir and 1 at Nalanda',
      'All meals as scheduled',
      'Trip coordination',
      'Planned sightseeing as described',
    ],
    exclusions: [
      'Museum and site entry fees',
      'Personal expenses',
      'Shopping',
      'Additional food and beverages',
      'Medical and emergency expenses',
      'Any service not listed under inclusions',
    ],
    vehicle: {
      policy: 'Vehicle is assigned by group size on the day.',
      possibilities: ['Toyota Innova Crysta', 'Bolero', 'Fortuner'],
      comfortNote: 'Three days of road time. A higher vehicle is preferred.',
      routeNote: 'Rajgir to Nalanda is about 20 km on good road.',
    },
    accommodation: {
      policy: 'Confirmed per departure; properties may differ from what is shown.',
      criteria: 'Clean rooms with hot water, close to each site cluster.',
      groupNote: 'One night at each location, allocated by the operator.',
    },
    bestTimeToTravel: 'September to March. Avoid the hottest months, and the monsoon entirely.',
    importantInformation: [
      { label: 'Walking', body: 'A good amount of walking is involved, including stone steps on Gridhakuta hill.' },
      { label: 'Heat', body: 'The sites are largely unshaded. Water and a hat are needed in the warmer months.' },
      { label: 'Site hours', body: 'Museum and excavation timings vary with season and public holidays.' },
      { label: 'Personal belongings', body: 'You are responsible for your own belongings, including cameras.' },
    ],
  },
];

export function findShowcaseTrip(slug) {
  return SHOWCASE_TRIPS.find((trip) => trip.slug === slug) ?? null;
}

/**
 * Showcase trips whose `destinationSlug` is exactly this destination slug.
 *
 * This is the ONLY way a destination page is allowed to mention a trip. It
 * cannot be a district match, a keyword match or a hand-written list, because
 * each of those invents a relationship the data does not state. An empty
 * result is the correct, honest answer for a destination no trip points at,
 * and the caller renders its empty state rather than padding the section.
 */
export function showcaseTripsForDestination(destinationSlug) {
  if (!destinationSlug) return [];
  return SHOWCASE_TRIPS.filter((trip) => trip.destinationSlug === destinationSlug);
}

export const CATEGORY_ORDER = [
  'Spiritual & Cultural',
  'Heritage',
  'Hills & Nature',
  'Wildlife & Seasonal',
];

/* ==========================================================================
   JOURNEY-FIRST PRESENTATION HELPERS
   --------------------------------------------------------------------------
   A SafarUp Trip is the product. It is a complete, multi-day journey across
   several locations and many places, with an overnight stay and a return.

   These helpers derive the journey view-model from the trip record. They are
   deliberately DERIVED rather than duplicated: a second hand-written copy of
   the route, the clusters or the facts would drift from `itinerary`, and a
   journey whose route disagrees with its own day-by-day plan is worse than no
   route at all.

   No live inventory is implied anywhere here: no price, departure date, seat
   count or availability is derived. `IS_SHOWCASE` stays the single switch.
   ========================================================================== */

/** `Jamui - Simultala - Jamui` — the route as one line of text. */
export function tripRouteSummary(trip) {
  if (!trip?.route?.length) return trip?.district ?? '';
  return trip.route.map((leg) => leg.name).join(' - ');
}

/**
 * Spoken form of the route, for an `aria-label`. The visual markers are
 * decorative, so this is the only thing a screen reader gets — it has to
 * carry start, overnight and return explicitly.
 */
export function tripRouteDescription(trip) {
  if (!trip?.route?.length) return '';
  const parts = trip.route.map((leg) => {
    if (leg.role === 'start') return `starting at ${leg.name}`;
    if (leg.role === 'overnight') return `overnight at ${leg.name}`;
    if (leg.role === 'return') return `then returning to ${leg.name}`;
    return `then ${leg.name}`;
  });
  return `Route: ${parts.join(', ')}.`;
}

/**
 * Group a journey's stops by the location they belong to, preserving the
 * order the route introduces them in.
 *
 * Ownership comes from the day, not from a name match on the stop: a stop is
 * attributed to the location that is current when it is reached. That is what
 * makes "Jamui - 4 places / Simultala - 3 places" truthful, and it means a
 * place visited on two days is listed once per location rather than duplicated.
 */
export function tripLocationClusters(trip) {
  if (!trip?.itinerary?.length) return [];

  const order = [];
  const byLocation = new Map();

  /**
   * The journey's own waypoints, by name.
   *
   * The last stop recorded on a day is the hand-off to the next location (or
   * the return), not a place visited there. Counting it as a place made
   * Day 1 of the Jamui journey report "Simultala" as a Jamui place and
   * overstate the total, and it also double-counted the boundary in a
   * three-day journey where both days pass through Nalanda.
   *
   * Every waypoint is already shown by `RouteLine`, so attributing it to a
   * cluster as well would make the journey look like it has more distinct
   * stops than it actually does.
   */
  const waypoints = new Set((trip.route ?? []).map((leg) => leg.name));

  for (const day of trip.itinerary) {
    // A day belongs to the location it departs from. The location it ends at
    // is where the next day takes over, and is attributed by that day.
    const location = day.startLocation;
    if (!location) continue;

    if (!byLocation.has(location)) {
      byLocation.set(location, { location, places: [], days: [] });
      order.push(location);
    }
    const cluster = byLocation.get(location);
    cluster.days.push(day.day);

    for (const stop of day.stops ?? []) {
      if (waypoints.has(stop.name)) continue;
      if (cluster.places.some((place) => place.name === stop.name)) continue;
      cluster.places.push({ name: stop.name, description: stop.description });
    }
  }

  return order.map((location) => {
    const cluster = byLocation.get(location);
    return {
      location,
      places: cluster.places,
      placeNames: cluster.places.map((place) => place.name),
      placeCount: cluster.places.length,
      days: cluster.days,
    };
  });
}

/** Total distinct places across the whole journey. */
export function tripPlaceCount(trip) {
  return tripLocationClusters(trip).reduce((total, cluster) => total + cluster.placeCount, 0);
}

/**
 * The quick-facts strip. Values are derived, never hand-typed, so a journey
 * cannot advertise a duration its own itinerary contradicts.
 */
export function tripFacts(trip) {
  if (!trip) return [];
  const facts = [
    { key: 'duration', label: 'Duration', value: trip.duration },
    { key: 'route', label: 'Route', value: tripRouteSummary(trip) },
    { key: 'places', label: 'Places', value: `${tripPlaceCount(trip)} places` },
    { key: 'season', label: 'Season', value: trip.season },
    { key: 'group', label: 'Group size', value: trip.groupSize },
  ];
  if (trip.nights != null) {
    facts.splice(1, 0, {
      key: 'nights',
      label: 'Nights',
      value: trip.nights === 0 ? 'No overnight' : `${trip.nights} night${trip.nights === 1 ? '' : 's'}`,
    });
  }
  return facts;
}
