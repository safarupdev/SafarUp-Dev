/**
 * Phase 2 production-defect regression tests.
 *
 * These four defects were found in review AFTER Phase 2 was reported green.
 * Each test below fails against the pre-fix code and passes after it, and each
 * states the user-visible or data-integrity harm it prevents.
 *
 *   A. `firestore.indexes.json` did not match the real query shapes.
 *   B. ARCHIVED/DRAFT Places leaked into public payloads and JSON-LD.
 *   C. A PATCH could change `slug` without touching the `slugClaims` table,
 *      orphaning the old claim and 404-ing a live published URL.
 *
 * Defect A is verified statically: the Firestore emulator auto-creates missing
 * composite indexes, so NO test against the emulator can detect a wrong
 * index file. Only a real project can. The static coverage test below is
 * therefore the only meaningful guard available in CI.
 *
 * ESM test file + `createRequire`, because the backend is CommonJS.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const request = require('supertest');
const bcrypt = require('bcryptjs');

const { requireEmulator, clearCollection, teardown } = require('./helpers/emulator.js');
const app = require('../src/app.js');
const User = require('../src/models/User.model.js');
const { ROLES } = require('../src/constants/roles.js');
const { getFirestore } = require('../src/config/database.js');
const districtRepository = require('../src/repositories/district.repository.js');
const categoryRepository = require('../src/repositories/category.repository.js');
const placeRepository = require('../src/repositories/place.repository.js');
const destinationRepository = require('../src/repositories/destination.repository.js');
const { resolveSlug, normalizeSlug } = require('../src/repositories/slugClaim.repository.js');

const COLLECTIONS = [
  'users',
  'destinations',
  'districts',
  'categories',
  'places',
  'slugClaims',
  'auditLogs',
];

const CONTENT_EMAIL = 'content@safarup.in';
const PASSWORD = 'Password123';
const IMAGE = 'https://example.com/lohagad-hero.jpg';
const AUDIT = { actorId: 'test-actor', actorRole: ROLES.CONTENT };

// ---------------------------------------------------------------------------
// Defect A — Firestore composite index coverage
// ---------------------------------------------------------------------------

/**
 * Every query shape reachable from a call site, transcribed from the four
 * repository `list()` implementations. Each entry must have a matching index.
 *
 * Equality filters are written `asc` because that is how a composite index
 * declares them; the notation cannot distinguish an equality filter from an
 * ascending `orderBy`, and Firestore's own index matching does not need to.
 *
 * `__name__` DESC is present wherever a repository ends its ordering with
 * `.orderBy('__name__', 'desc')`: Firestore only auto-appends `__name__`
 * ASCENDING to a composite index, so a descending document-ID tiebreak must be
 * declared explicitly. That single omission is what made every previously
 * declared `destinations` and `districts` index unusable.
 */
const REACHABLE_SHAPES = {
  districts: [
    ['updatedAt:desc', '__name__:desc'],
    ['status:asc', 'updatedAt:desc', '__name__:desc'],
  ],
  categories: [
    ['sortOrder:asc', 'name:asc'],
    ['status:asc', 'sortOrder:asc', 'name:asc'],
  ],
  places: [
    ['status:asc', 'updatedAt:desc'],
    ['districtId:asc', 'updatedAt:desc'],
    ['categoryIds:contains', 'updatedAt:desc'],
    ['status:asc', 'districtId:asc', 'updatedAt:desc'],
    ['status:asc', 'categoryIds:contains', 'updatedAt:desc'],
    ['districtId:asc', 'categoryIds:contains', 'updatedAt:desc'],
    ['status:asc', 'districtId:asc', 'categoryIds:contains', 'updatedAt:desc'],
  ],
  destinations: [
    ['updatedAt:desc', '__name__:desc'],
    ['status:asc', 'updatedAt:desc', '__name__:desc'],
    ['status:asc', 'featured:asc', 'updatedAt:desc', '__name__:desc'],
    ['status:asc', 'districtId:asc', 'updatedAt:desc', '__name__:desc'],
    ['status:asc', 'categoryIds:contains', 'updatedAt:desc', '__name__:desc'],
    ['status:asc', 'featured:asc', 'districtId:asc', 'updatedAt:desc', '__name__:desc'],
    ['status:asc', 'featured:asc', 'categoryIds:contains', 'updatedAt:desc', '__name__:desc'],
    ['status:asc', 'districtId:asc', 'categoryIds:contains', 'updatedAt:desc', '__name__:desc'],
    [
      'status:asc',
      'featured:asc',
      'districtId:asc',
      'categoryIds:contains',
      'updatedAt:desc',
      '__name__:desc',
    ],
  ],
};

/** Turns one declared index into the same signature notation used above. */
function signatureOf(index) {
  return index.fields.map((field) => {
    if (field.arrayConfig) return `${field.fieldPath}:contains`;
    if (field.fieldPath === '__name__') return '__name__:desc';
    return `${field.fieldPath}:${field.order === 'DESCENDING' ? 'desc' : 'asc'}`;
  });
}

describe('A. firestore.indexes.json matches the real query shapes', () => {
  const declared = JSON.parse(
    readFileSync(new URL('../../firestore.indexes.json', import.meta.url), 'utf8')
  );

  it('declares an index for every reachable query shape', () => {
    const missing = [];
    for (const [collection, shapes] of Object.entries(REACHABLE_SHAPES)) {
      const have = declared.indexes
        .filter((index) => index.collectionGroup === collection)
        .map((index) => signatureOf(index).join('|'));
      for (const shape of shapes) {
        if (!have.includes(shape.join('|'))) {
          missing.push(`${collection}: [${shape.join(', ')}]`);
        }
      }
    }
    expect(missing, `Undeclared composite indexes:\n${missing.join('\n')}`).toEqual([]);
  });

  it('declares no index that no query can use', () => {
    const orphans = [];
    for (const index of declared.indexes) {
      const reachable = REACHABLE_SHAPES[index.collectionGroup] ?? [];
      const signature = signatureOf(index).join('|');
      if (!reachable.some((shape) => shape.join('|') === signature)) {
        orphans.push(`${index.collectionGroup}: [${signature}]`);
      }
    }
    expect(orphans, `Indexes no query can use:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('declares the descending document-ID tiebreak the cursor queries order by', () => {
    for (const collection of ['districts', 'destinations']) {
      const indexes = declared.indexes.filter((index) => index.collectionGroup === collection);
      const withTiebreak = indexes.filter((index) =>
        index.fields.some(
          (field) => field.fieldPath === '__name__' && field.order === 'DESCENDING'
        )
      );
      expect(
        withTiebreak.length,
        `${collection} cursor queries end in .orderBy('__name__','desc')`
      ).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Defect B — unpublished Places must not reach public payloads
// ---------------------------------------------------------------------------

describe('B. unpublished Places never reach a public payload', () => {
  beforeAll(async () => {
    await requireEmulator();
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    for (const collection of COLLECTIONS) await clearCollection(collection);
    await User.create({
      email: CONTENT_EMAIL,
      displayName: 'Content',
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: ROLES.CONTENT,
      emailVerified: true,
      status: 'active',
    });
  });

  async function adminCookie() {
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: CONTENT_EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    return res.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0];
  }

  it('omits an ARCHIVED Place from the public detail payload and JSON-LD source', async () => {
    const district = await districtRepository.create({
      name: 'Pune District',
      slug: 'pune-district',
      status: 'PUBLISHED',
    });
    const live = await placeRepository.create({
      name: 'Lohagad Fort',
      slug: 'lohagad-fort',
      districtId: district._id,
      description: 'A hill fort near Lonavala in the Sahyadri range.',
      status: 'PUBLISHED',
    });
    const withdrawn = await placeRepository.create({
      name: 'Withdrawn Fort',
      slug: 'withdrawn-fort',
      districtId: district._id,
      description: 'A fort that was deliberately withdrawn from publication.',
      status: 'PUBLISHED',
    });
    await placeRepository.setStatus(withdrawn._id, 'ARCHIVED', AUDIT);

    const destination = await destinationRepository.create({
      name: 'Lonavala',
      slug: 'lonavala',
      districtId: district._id,
      categoryIds: [],
      placeIds: [live._id, withdrawn._id],
      shortDescription: 'A hill station in the Sahyadri range.',
      description: 'A popular weekend hill station just beyond the Western Ghats.',
      heroImage: IMAGE,
      seoTitle: 'Lonavala — Hill Station',
      metaDescription: 'Plan a weekend trip to Lonavala with SafarUp.',
      canonicalUrl: 'https://safarup.in/destinations/lonavala',
      status: 'PUBLISHED',
    });

    const res = await request(app).get(`/api/destinations/${destination.slug}`);

    expect(res.status).toBe(200);
    const names = res.body.data.destination.places.map((p) => p.name);
    const slugs = res.body.data.destination.places.map((p) => p.slug);
    expect(names).toContain('Lohagad Fort');
    expect(names).not.toContain('Withdrawn Fort');
    // The slug matters as much as the name: it is what the public "places"
    // chips and any future /places/:slug link are built from.
    expect(slugs).not.toContain('withdrawn-fort');
  });

  it('omits an unpublished Place from the public LIST payload', async () => {
    const district = await districtRepository.create({
      name: 'Pune District',
      slug: 'pune-district',
      status: 'PUBLISHED',
    });
    const draft = await placeRepository.create({
      name: 'Draft Fort',
      slug: 'draft-fort',
      districtId: district._id,
      description: 'A place still being written and not yet published.',
      status: 'DRAFT',
    });
    await destinationRepository.create({
      name: 'Lonavala',
      slug: 'lonavala',
      districtId: district._id,
      categoryIds: [],
      placeIds: [draft._id],
      shortDescription: 'A hill station in the Sahyadri range.',
      description: 'A popular weekend hill station just beyond the Western Ghats.',
      heroImage: IMAGE,
      seoTitle: 'Lonavala — Hill Station',
      metaDescription: 'Plan a weekend trip to Lonavala with SafarUp.',
      canonicalUrl: 'https://safarup.in/destinations/lonavala',
      status: 'PUBLISHED',
    });

    const res = await request(app).get('/api/destinations?limit=20');

    expect(res.status).toBe(200);
    const places = res.body.data.items.flatMap((d) => d.places ?? []);
    expect(places.map((p) => p.name)).not.toContain('Draft Fort');
  });

  it('omits an unpublished District and Category from the public payload', async () => {
    const draftDistrict = await districtRepository.create({
      name: 'Draft District',
      slug: 'draft-district',
      status: 'DRAFT',
    });
    const draftCategory = await categoryRepository.create({
      name: 'Draft Category',
      slug: 'draft-category',
      status: 'DRAFT',
      sortOrder: 1,
    });
    const destination = await destinationRepository.create({
      name: 'Lonavala',
      slug: 'lonavala',
      districtId: draftDistrict._id,
      categoryIds: [draftCategory._id],
      placeIds: [],
      shortDescription: 'A hill station in the Sahyadri range.',
      description: 'A popular weekend hill station just beyond the Western Ghats.',
      heroImage: IMAGE,
      seoTitle: 'Lonavala — Hill Station',
      metaDescription: 'Plan a weekend trip to Lonavala with SafarUp.',
      canonicalUrl: 'https://safarup.in/destinations/lonavala',
      status: 'PUBLISHED',
    });

    const res = await request(app).get(`/api/destinations/${destination.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.data.destination.district).toBeNull();
    expect(res.body.data.destination.categories).toEqual([]);
  });

  it('still shows unpublished references to the Admin CMS', async () => {
    // The fix must not over-restrict: an editor has to be able to see that a
    // referenced Place exists and is currently ARCHIVED in order to fix it.
    const district = await districtRepository.create({
      name: 'Pune District',
      slug: 'pune-district',
      status: 'PUBLISHED',
    });
    const withdrawn = await placeRepository.create({
      name: 'Withdrawn Fort',
      slug: 'withdrawn-fort',
      districtId: district._id,
      description: 'A fort that was deliberately withdrawn from publication.',
      status: 'PUBLISHED',
    });
    await placeRepository.setStatus(withdrawn._id, 'ARCHIVED', AUDIT);

    const destination = await destinationRepository.create({
      name: 'Lonavala',
      slug: 'lonavala',
      districtId: district._id,
      categoryIds: [],
      placeIds: [withdrawn._id],
      shortDescription: 'A hill station in the Sahyadri range.',
      description: 'A popular weekend hill station just beyond the Western Ghats.',
      heroImage: IMAGE,
      seoTitle: 'Lonavala — Hill Station',
      metaDescription: 'Plan a weekend trip to Lonavala with SafarUp.',
      canonicalUrl: 'https://safarup.in/destinations/lonavala',
      status: 'PUBLISHED',
    });

    const cookie = await adminCookie();
    const res = await request(app)
      .get(`/api/admin/destinations/${destination._id}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.destination.places.map((p) => p.name)).toContain('Withdrawn Fort');
  });
});

// ---------------------------------------------------------------------------
// Defect C — slug mutation must not break the claim table or a live URL
// ---------------------------------------------------------------------------

describe('C. a PATCH cannot change a slug behind the claim table', () => {
  beforeAll(async () => {
    await requireEmulator();
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    for (const collection of COLLECTIONS) await clearCollection(collection);
    await User.create({
      email: CONTENT_EMAIL,
      displayName: 'Content',
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: ROLES.CONTENT,
      emailVerified: true,
      status: 'active',
    });
  });

  async function adminCookie() {
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: CONTENT_EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    return res.headers['set-cookie'].find((c) => c.startsWith('accessToken=')).split(';')[0];
  }

  async function seedPublishedDestination(slug = 'lonavala') {
    const district = await districtRepository.create({
      name: `District for ${slug}`,
      slug: `district-for-${slug}`,
      status: 'PUBLISHED',
    });
    return destinationRepository.create({
      name: 'Lonavala',
      slug,
      districtId: district._id,
      categoryIds: [],
      placeIds: [],
      shortDescription: 'A hill station in the Sahyadri range.',
      description: 'A popular weekend hill station just beyond the Western Ghats.',
      heroImage: IMAGE,
      seoTitle: 'Lonavala — Hill Station',
      metaDescription: 'Plan a weekend trip to Lonavala with SafarUp.',
      canonicalUrl: `https://safarup.in/destinations/${slug}`,
      status: 'PUBLISHED',
    });
  }

  it('rejects a slug change with 400 and does not write the document', async () => {
    const created = await seedPublishedDestination();
    const cookie = await adminCookie();

    const res = await request(app)
      .patch(`/api/admin/destinations/${created._id}`)
      .set('Cookie', cookie)
      .send({ slug: 'lonavala-renamed' });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'slug')).toBe(true);

    const stored = await destinationRepository.get(created._id);
    expect(stored.slug).toBe('lonavala');
  });

  it('leaves the live published URL resolving after a rejected slug change', async () => {
    const created = await seedPublishedDestination();
    const cookie = await adminCookie();

    const before = await request(app).get('/api/destinations/lonavala');
    expect(before.status).toBe(200);

    await request(app)
      .patch(`/api/admin/destinations/${created._id}`)
      .set('Cookie', cookie)
      .send({ slug: 'lonavala-renamed' });

    // The pre-fix failure mode: the entity kept a new slug with no claim, so
    // public slug resolution 404s a page that is still live and in the sitemap.
    const stillLive = await request(app).get('/api/destinations/lonavala');
    expect(stillLive.status).toBe(200);
    expect(stillLive.body.data.destination.id).toBe(created._id);
  });

  it('does not orphan the old claim or create a claim for the rejected slug', async () => {
    const created = await seedPublishedDestination();
    const cookie = await adminCookie();

    await request(app)
      .patch(`/api/admin/destinations/${created._id}`)
      .set('Cookie', cookie)
      .send({ slug: 'lonavala-renamed' });

    const oldClaim = await resolveSlug('lonavala');
    expect(oldClaim).toEqual({ entityId: created._id, collection: 'destinations' });

    // Nothing may claim the rejected slug, or it is permanently unusable.
    expect(await resolveSlug('lonavala-renamed')).toBeNull();

    const claims = await getFirestore().collection('slugClaims').get();
    expect(claims.docs.map((d) => d.id)).toContain(normalizeSlug('lonavala'));
    expect(claims.docs.map((d) => d.id)).not.toContain(normalizeSlug('lonavala-renamed'));
  });

  it('rejects concurrent slug changes to the same target without corrupting claims', async () => {
    const first = await seedPublishedDestination('lonavala');
    const second = await seedPublishedDestination('malshej');
    const cookie = await adminCookie();

    // Two CONTENT users racing to move two different entities onto one slug.
    // `releaseSlug` is not involved, so nothing can be silently released.
    const responses = await Promise.all([
      request(app)
        .patch(`/api/admin/destinations/${first._id}`)
        .set('Cookie', cookie)
        .send({ slug: 'shared-target' }),
      request(app)
        .patch(`/api/admin/destinations/${second._id}`)
        .set('Cookie', cookie)
        .send({ slug: 'shared-target' }),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(400);
      expect(res.body.details.some((d) => d.field === 'slug')).toBe(true);
    }

    expect((await destinationRepository.get(first._id)).slug).toBe('lonavala');
    expect((await destinationRepository.get(second._id)).slug).toBe('malshej');
    expect(await resolveSlug('shared-target')).toBeNull();
    expect(await resolveSlug('lonavala')).toEqual({ entityId: first._id, collection: 'destinations' });
    expect(await resolveSlug('malshej')).toEqual({ entityId: second._id, collection: 'destinations' });
  });

  it('rejects a slug change on every content entity, not just destinations', async () => {
    const cookie = await adminCookie();

    const district = await districtRepository.create({
      name: 'Pune District',
      slug: 'pune-district',
      status: 'PUBLISHED',
    });
    const category = await categoryRepository.create({
      name: 'Hill Stations',
      slug: 'hill-stations',
      status: 'PUBLISHED',
      sortOrder: 1,
    });
    const place = await placeRepository.create({
      name: 'Lohagad Fort',
      slug: 'lohagad-fort',
      districtId: district._id,
      description: 'A hill fort near Lonavala in the Sahyadri range.',
      status: 'PUBLISHED',
    });

    for (const [path, id] of [
      ['districts', district._id],
      ['categories', category._id],
      ['places', place._id],
    ]) {
      const res = await request(app)
        .patch(`/api/admin/${path}/${id}`)
        .set('Cookie', cookie)
        .send({ slug: 'renamed-entity' });

      expect(res.status, `${path} must reject a slug change`).toBe(400);
      expect(res.body.details.some((d) => d.field === 'slug')).toBe(true);
    }
  });
});
