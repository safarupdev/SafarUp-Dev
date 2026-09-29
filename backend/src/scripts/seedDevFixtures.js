/**
 * DEVELOPMENT FIXTURES — Firestore emulator only.
 *
 * Why this exists: the public destination experience cannot be reviewed
 * against the Stitch designs with an empty catalogue. `/destinations` rendered
 * only its empty state, and `/destinations/:slug` could not render at all, so
 * there was no way to verify the Destination Detail page, its Place references
 * or its published/archived behaviour.
 *
 * This script creates the smallest realistic content graph that makes those
 * pages reviewable:
 *
 *   - 3 PUBLISHED destinations (so detail + relationships + filters work)
 *   - 1 ARCHIVED destination (so the public list provably EXCLUDES it)
 *   - 1 DRAFT destination (so the publish filter is exercised both ways)
 *   - districts, categories and places forming real 1:1 / N:M references
 *
 * **Emulator only, enforced.** The script refuses to run unless
 * `FIRESTORE_EMULATOR_HOST` is set, so it cannot write to a real project even
 * by accident. The emulator is unauthenticated; a production Firestore would
 * reject these credentials, and `config/env.js` separately refuses to boot in
 * production with the emulator enabled.
 *
 * It writes through the real repositories, so it exercises the same
 * `createWithSlug` / `setStatus` / `setFeatured` paths the CMS uses, including
 * the slug-claim transaction.
 *
 * Safe to re-run: entities that already exist (matched on slug) are reused
 * rather than duplicated, because slugs are globally claimed.
 *
 * Usage (from the backend/ directory, with the emulator running):
 *   $env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
 *   node src/scripts/seedDevFixtures.js
 *
 * Pass --reset to delete the content collections first. This is needed after
 * changing fixture content, because reuse-by-slug keeps the OLD document when
 * the slug has not changed, so an edit to a name or description would
 * otherwise appear to do nothing.
 */

const { connectDatabase, disconnectDatabase, getFirestore } = require('../config/database');
const districtRepository = require('../repositories/district.repository');
const categoryRepository = require('../repositories/category.repository');
const placeRepository = require('../repositories/place.repository');
const destinationRepository = require('../repositories/destination.repository');
const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');

const AUDIT = { actorId: 'dev-fixtures', actorRole: ROLES.SUPER_ADMIN };

const RESETTABLE = ['districts', 'categories', 'places', 'destinations', 'slugClaims', 'auditLogs'];

/** Deletes every document in the content collections. Emulator only. */
async function reset() {
  const db = getFirestore();
  for (const collection of RESETTABLE) {
    const snapshot = await db.collection(collection).get();
    if (snapshot.empty) continue;
    const batch = db.batch();
    for (const doc of snapshot.docs) batch.delete(doc.ref);
    await batch.commit();
    logger.info('Cleared collection.', { collection, deleted: snapshot.size });
  }
}

const IMAGE = 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1920&q=70';

// Named without a trailing "District": the UI renders the eyebrow as
// "{name} District", so a district called "Gaya District" produced
// "Gaya District District" on the destination hero.
const DISTRICTS = [
  { name: 'Gaya', slug: 'gaya-district' },
  { name: 'Nalanda', slug: 'nalanda-district' },
];

const CATEGORIES = [
  { name: 'Heritage', slug: 'heritage', sortOrder: 1 },
  { name: 'Spiritual & Cultural', slug: 'spiritual-cultural', sortOrder: 2 },
  { name: 'Wildlife & Seasonal', slug: 'wildlife-seasonal', sortOrder: 3 },
];

const PLACES = [
  {
    name: 'Mahabodhi Temple',
    slug: 'mahabodhi-temple',
    district: 'gaya-district',
    categories: ['heritage', 'spiritual-cultural'],
    description:
      'The Mahabodhi temple at Bodh Gaya, the oldest surviving brick temple in India and the central shrine of the Buddhist world.',
  },
  {
    name: 'Nalanda Excavations',
    slug: 'nalanda-excavations',
    district: 'nalanda-district',
    categories: ['heritage'],
    description:
      'The excavated remains of Nalanda Mahavihara, a monastic university that drew scholars from across Asia for centuries.',
  },
  {
    name: 'Nagi-Nakti Bird Sanctuary',
    slug: 'nagi-nakti-bird-sanctuary',
    district: 'nalanda-district',
    categories: ['wildlife-seasonal'],
    description:
      'A protected sanctuary on the plateau above Jamui where migratory birds gather through the winter months.',
  },
  {
    // Deliberately ARCHIVED. Exercises the regression fix that stops an
    // archived Place leaking into a public destination payload and its
    // includesAttraction JSON-LD.
    name: 'Withdrawn Riverside Fort',
    slug: 'withdrawn-riverside-fort',
    district: 'gaya-district',
    categories: ['heritage'],
    description:
      'A fort taken out of publication. It exists only to prove archived Places are withheld from public reads.',
    status: 'ARCHIVED',
  },
];

/**
 * `status` is the FINAL state to land, applied through setStatus so the
 * lifecycle is exercised the same way the CMS does it.
 */
const DESTINATIONS = [
  {
    name: 'Bodh Gaya',
    slug: 'bodh-gaya',
    district: 'gaya-district',
    categories: ['heritage', 'spiritual-cultural'],
    places: ['mahabodhi-temple', 'withdrawn-riverside-fort'],
    shortDescription: 'The Mahabodhi temple complex and the seat of the Buddhist world.',
    description:
      'Bodh Gaya is the place the Buddha is held to have attained awakening, and it has been a site of continuous devotion for more than two and a half millennia. The temple, the Diamond Throne and the surrounding monasteries make it the single most important Buddhist destination in India.',
    highlights: ['The Mahabodhi temple and the Bodhi tree', 'The Diamond Throne at the temple centre'],
    featured: true,
    status: 'PUBLISHED',
  },
  {
    name: 'Nalanda',
    slug: 'nalanda',
    district: 'nalanda-district',
    categories: ['heritage'],
    places: ['nalanda-excavations'],
    shortDescription: 'The excavated monastic university that drew scholars from across Asia.',
    description:
      'Nalanda Mahavihara was a residential university running for several centuries, and its excavated site is among the most moving ruins in India.',
    highlights: ['The excavated monastic quadrangles', 'The temple shrine complex'],
    featured: true,
    status: 'PUBLISHED',
  },
  {
    name: 'Simultala',
    slug: 'simultala',
    district: 'nalanda-district',
    categories: ['wildlife-seasonal'],
    places: ['nagi-nakti-bird-sanctuary'],
    shortDescription: 'A forest hill station above Jamui and a wintering ground for birds.',
    description:
      'Simultala is a quiet forest hill station in the ranges above Jamui, best known for the migratory birds that gather on the plateau through the winter.',
    highlights: ['The forest trails above the plateau', 'Winter bird arrivals'],
    featured: false,
    status: 'PUBLISHED',
  },
  {
    // Archived on purpose. The public list must NOT return it, and
    // /destinations/withdrawn-district must 404 rather than disclose it.
    name: 'Withdrawn District',
    slug: 'withdrawn-district',
    district: 'gaya-district',
    categories: ['heritage'],
    places: [],
    shortDescription: 'A destination taken out of publication.',
    description:
      'A destination that was archived. It exists to prove archived content is withheld from every public read path.',
    highlights: [],
    featured: false,
    status: 'ARCHIVED',
  },
];

/** Reuses an existing entity by slug, otherwise creates it. */
async function ensure(repo, fields) {
  const existing = await repo.findOneBySlug(fields.slug);
  if (existing) return existing;
  return repo.create(fields);
}

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    logger.error(
      'Refusing to run: FIRESTORE_EMULATOR_HOST is not set. These are DEVELOPMENT fixtures and must never be written to a real Firestore project.'
    );
    process.exitCode = 1;
    return;
  }

  await connectDatabase();
  logger.info('Seeding development fixtures into the emulator.', {
    emulator: process.env.FIRESTORE_EMULATOR_HOST,
  });

  if (process.argv.includes('--reset')) {
    await reset();
  }

  const districts = {};
  for (const spec of DISTRICTS) {
    districts[spec.slug] = await ensure(districtRepository, { ...spec, status: 'PUBLISHED' });
  }

  const categories = {};
  for (const spec of CATEGORIES) {
    categories[spec.slug] = await ensure(categoryRepository, { ...spec, status: 'PUBLISHED' });
  }

  const places = {};
  for (const spec of PLACES) {
    const created = await ensure(placeRepository, {
      name: spec.name,
      slug: spec.slug,
      districtId: districts[spec.district]._id,
      categoryIds: spec.categories.map((slug) => categories[slug]._id),
      description: spec.description,
      heroImage: IMAGE,
      status: 'PUBLISHED',
    });
    if (spec.status && spec.status !== 'PUBLISHED') {
      await placeRepository.setStatus(created._id, spec.status, AUDIT);
    }
    places[spec.slug] = created;
  }

  const summary = { published: [], archived: [], draft: [] };
  for (const spec of DESTINATIONS) {
    const created = await ensure(destinationRepository, {
      name: spec.name,
      slug: spec.slug,
      districtId: districts[spec.district]._id,
      categoryIds: spec.categories.map((slug) => categories[slug]._id),
      placeIds: spec.places.map((slug) => places[slug]._id),
      shortDescription: spec.shortDescription,
      description: spec.description,
      heroImage: IMAGE,
      gallery: [IMAGE],
      highlights: spec.highlights,
      travelInformation: {
        nearestRailHead: 'Gaya Junction (GAYA)',
        bestTimeToVisit: 'October to March',
        howToReach: 'By road from Patna or Gaya.',
      },
      seoTitle: `${spec.name} — SafarUp`,
      metaDescription: spec.shortDescription,
      canonicalUrl: `https://safarup.in/destinations/${spec.slug}`,
      ogImage: IMAGE,
      status: 'DRAFT',
    });

    // Lifecycle is always driven through setStatus, never by writing the field.
    if (spec.status !== 'DRAFT') {
      await destinationRepository.setStatus(created._id, spec.status, AUDIT);
    }
    if (spec.featured && spec.status === 'PUBLISHED') {
      await destinationRepository.setFeatured(created._id, true, AUDIT);
    }
    summary[spec.status.toLowerCase()].push(spec.slug);
  }

  logger.info('Development fixtures seeded.', summary);

  await disconnectDatabase();
}

main().catch((error) => {
  logger.error('Fixture seed failed', { error: error.message });
  process.exitCode = 1;
});
