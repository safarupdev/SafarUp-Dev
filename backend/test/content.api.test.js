/**
 * Public content API tests — PRD §63, API.destination.contract.md.
 *
 * Exercises the shipped HTTP surface with supertest against the Firestore
 * emulator, mirroring auth.test.js.
 *
 * The behaviours locked in here are the ones a public, AI-crawlable surface
 * must never get wrong:
 *
 *   - anonymous reads return PUBLISHED content only
 *   - an unpublished slug answers 404, never 403 (403 would disclose that
 *     unpublished content exists) and never 200
 *   - `?q=` is rejected explicitly rather than silently returning an
 *     unfiltered list
 *   - admin routes enforce authentication AND role server-side
 *   - input validation is the backend's job, not the client's
 *   - create/publish leave an audit trail
 */

import { createRequire } from 'node:module';
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

const COLLECTIONS = ['destinations', 'districts', 'categories', 'places', 'slugClaims', 'auditLogs'];

const CONTENT_EMAIL = 'content@safarup.in';
const CUSTOMER_EMAIL = 'customer@safarup.in';
const PASSWORD = 'Password123';

const IMAGE = 'https://example.com/lonavala-hero.jpg';

async function seedUser(email, role) {
  return User.create({
    email,
    displayName: role,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role,
    emailVerified: true,
    status: 'active',
  });
}

function cookie(response, name) {
  const raw = response.headers['set-cookie'] || [];
  const match = raw.find((c) => c.startsWith(`${name}=`));
  return match ? match.split(';')[0] : undefined;
}

/** Admin-portal login; returns the accessToken cookie header. */
async function adminSession(email) {
  const res = await request(app)
    .post('/api/auth/admin/login')
    .send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return cookie(res, 'accessToken');
}

/** Customer-portal login; returns the accessToken cookie header. */
async function customerSession(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return cookie(res, 'accessToken');
}

/** District + category + place, all PUBLISHED so they resolve publicly. */
async function seedTaxonomy() {
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

  return { district, category, place };
}

function destinationBody(overrides = {}) {
  return {
    name: 'Lonavala',
    slug: 'lonavala',
    districtId: null,
    categoryIds: [],
    placeIds: [],
    shortDescription: 'A hill station in the Sahyadri range.',
    description: 'A popular weekend hill station just beyond the Western Ghats.',
    heroImage: IMAGE,
    seoTitle: 'Lonavala — Hill Station',
    metaDescription: 'Plan a weekend trip to Lonavala with SafarUp.',
    canonicalUrl: 'https://safarup.in/destinations/lonavala',
    ...overrides,
  };
}

/** A fully valid create payload bound to the seeded taxonomy. */
function createPayload(taxonomy, overrides = {}) {
  return destinationBody({
    districtId: taxonomy.district._id,
    categoryIds: [taxonomy.category._id],
    placeIds: [taxonomy.place._id],
    ...overrides,
  });
}

/**
 * Publishes via the repository so `publishedAt` is stamped, mirroring what
 * `POST /api/admin/destinations/:id/publish` does.
 */
async function seedPublishedDestination(fields) {
  const created = await destinationRepository.create(destinationBody({ ...fields, status: 'DRAFT' }));
  return destinationRepository.setStatus(created._id, 'PUBLISHED', {
    actorId: 'seed-actor',
    actorRole: ROLES.CONTENT,
  });
}

async function auditActions() {
  const snapshot = await getFirestore().collection('auditLogs').get();
  return snapshot.docs.map((doc) => doc.data());
}

beforeAll(async () => {
  await requireEmulator();
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  for (const name of COLLECTIONS) {
    await clearCollection(name);
  }
  await clearCollection('users');
  await seedUser(CONTENT_EMAIL, ROLES.CONTENT);
  await seedUser(CUSTOMER_EMAIL, ROLES.CUSTOMER);
});

describe('GET /api/destinations', () => {
  it('returns only PUBLISHED destinations', async () => {
    const taxonomy = await seedTaxonomy();
    await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'DRAFT', slug: 'draft-one' })
    );
    await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'ARCHIVED', slug: 'archived-one' })
    );
    await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'PUBLISHED', slug: 'live-one' })
    );

    const res = await request(app).get('/api/destinations');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].slug).toBe('live-one');
    expect(res.body.data.items[0].status).toBe('PUBLISHED');
  });

  it('resolves references on every item in the list', async () => {
    const taxonomy = await seedTaxonomy();
    await destinationRepository.create(
      destinationBody({
        districtId: taxonomy.district._id,
        categoryIds: [taxonomy.category._id],
        placeIds: [taxonomy.place._id],
        status: 'PUBLISHED',
      })
    );

    const res = await request(app).get('/api/destinations');

    expect(res.body.data.items[0]).toMatchObject({
      district: { id: taxonomy.district._id, slug: 'pune-district', name: 'Pune District' },
      categories: [{ id: taxonomy.category._id, slug: 'hill-stations', name: 'Hill Stations' }],
      places: [{ id: taxonomy.place._id, slug: 'lohagad-fort', name: 'Lohagad Fort' }],
    });
  });

  it('is bounded — a limit never returns more than the page size', async () => {
    const { district } = await seedTaxonomy();
    for (let i = 0; i < 25; i += 1) {
      await destinationRepository.create(
        destinationBody({ name: `Destination ${i}`, slug: `destination-${i}`, districtId: district._id, status: 'PUBLISHED' })
      );
    }

    const res = await request(app).get('/api/destinations?limit=5');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(5);
    // More pages exist, so a cursor is offered.
    expect(res.body.data.nextCursor).toBeTruthy();
  });

  it('exposes a nextCursor only while more pages remain', async () => {
    const { district } = await seedTaxonomy();
    for (let i = 0; i < 3; i += 1) {
      await destinationRepository.create(
        destinationBody({ name: `Destination ${i}`, slug: `destination-${i}`, districtId: district._id, status: 'PUBLISHED' })
      );
    }

    const all = await request(app).get('/api/destinations?limit=3');
    expect(all.body.data.items).toHaveLength(3);
    expect(all.body.data.nextCursor).toBeNull();

    const first = await request(app).get('/api/destinations?limit=2');
    expect(first.body.data.items).toHaveLength(2);
    expect(first.body.data.nextCursor).toBeTruthy();

    const second = await request(app)
      .get(`/api/destinations?limit=2&cursor=${encodeURIComponent(first.body.data.nextCursor)}`);
    expect(second.status).toBe(200);
    expect(second.body.data.items).toHaveLength(1);
    expect(second.body.data.nextCursor).toBeNull();
  });

  it('filters by district slug', async () => {
    const taxonomy = await seedTaxonomy();
    const other = await districtRepository.create({
      name: 'Mumbai Suburban',
      slug: 'mumbai-suburban',
      status: 'PUBLISHED',
    });

    await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'PUBLISHED' })
    );
    await destinationRepository.create(
      destinationBody({ name: 'Alibaug', slug: 'alibaug', districtId: other._id, status: 'PUBLISHED' })
    );

    const res = await request(app).get('/api/destinations?district=pune-district');
    expect(res.body.data.items.map((d) => d.slug)).toEqual(['lonavala']);
  });

  it('filters by category slug', async () => {
    const taxonomy = await seedTaxonomy();
    await destinationRepository.create(
      destinationBody({
        districtId: taxonomy.district._id,
        categoryIds: [taxonomy.category._id],
        status: 'PUBLISHED',
      })
    );
    await destinationRepository.create(
      destinationBody({ name: 'Lonavala Beach', slug: 'lonavala-beach', districtId: taxonomy.district._id, status: 'PUBLISHED' })
    );

    const res = await request(app).get('/api/destinations?category=hill-stations');
    expect(res.body.data.items.map((d) => d.slug)).toEqual(['lonavala']);
  });

  it('rejects ?q= with 400 SEARCH_NOT_AVAILABLE instead of silently ignoring it', async () => {
    const { district } = await seedTaxonomy();
    await destinationRepository.create(
      destinationBody({ districtId: district._id, status: 'PUBLISHED' })
    );

    const res = await request(app).get('/api/destinations?q=anything');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SEARCH_NOT_AVAILABLE');
    // Critically: an unfiltered result set must NOT be returned as if it
    // were the search result.
    expect(res.body.data).toBeUndefined();
  });
});

describe('GET /api/destinations/:slug', () => {
  it('returns the contract payload shape', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublishedDestination({
      districtId: taxonomy.district._id,
      categoryIds: [taxonomy.category._id],
      placeIds: [taxonomy.place._id],
    });

    const res = await request(app).get('/api/destinations/lonavala');

    expect(res.status).toBe(200);
    const destination = res.body.data.destination;

    expect(destination.slug).toBe('lonavala');
    expect(destination.name).toBe('Lonavala');
    expect(typeof destination.id).toBe('string');

    // References are resolved to id + slug + name, never raw IDs alone.
    expect(destination.district).toEqual({
      id: taxonomy.district._id,
      slug: 'pune-district',
      name: 'Pune District',
    });
    expect(destination.categories).toEqual([
      { id: taxonomy.category._id, slug: 'hill-stations', name: 'Hill Stations' },
    ]);
    expect(destination.places).toEqual([
      { id: taxonomy.place._id, slug: 'lohagad-fort', name: 'Lohagad Fort' },
    ]);

    // SEO is a nested object on the wire.
    expect(destination.seo).toEqual({
      title: 'Lonavala — Hill Station',
      description: 'Plan a weekend trip to Lonavala with SafarUp.',
      canonicalUrl: 'https://safarup.in/destinations/lonavala',
      ogImage: IMAGE,
    });

    // Dates are ISO 8601 strings, never {_seconds, _nanoseconds}.
    for (const field of ['publishedAt', 'updatedAt']) {
      expect(typeof destination[field]).toBe('string');
      expect(destination[field]).toBe(new Date(destination[field]).toISOString());
    }

    expect(destination.status).toBe('PUBLISHED');
    expect(destination.featured).toBe(false);
    expect(Array.isArray(destination.gallery)).toBe(true);
    expect(Array.isArray(destination.highlights)).toBe(true);
    expect(typeof destination.travelInformation).toBe('object');
  });

  it('never leaks raw Firestore Timestamps into the payload', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublishedDestination({ districtId: taxonomy.district._id });

    const res = await request(app).get('/api/destinations/lonavala');
    const raw = JSON.stringify(res.body);

    expect(raw).not.toContain('_seconds');
    expect(raw).not.toContain('_nanoseconds');
  });

  it('returns 404 for a DRAFT slug — not 403, not 200', async () => {
    const taxonomy = await seedTaxonomy();
    await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'DRAFT' })
    );

    const res = await request(app).get('/api/destinations/lonavala');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });

  it('returns the same 404 for an ARCHIVED slug as for an unknown slug', async () => {
    const taxonomy = await seedTaxonomy();
    await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'ARCHIVED' })
    );

    const archived = await request(app).get('/api/destinations/lonavala');
    const unknown = await request(app).get('/api/destinations/never-existed');

    expect(archived.status).toBe(404);
    expect(unknown.status).toBe(404);
    // Identical bodies — an attacker cannot distinguish "exists but is
    // hidden" from "does not exist".
    expect(archived.body.message).toBe(unknown.body.message);
  });
});

describe('admin authorization', () => {
  it('returns 401 for an unauthenticated admin list', async () => {
    const res = await request(app).get('/api/admin/destinations');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app)
      .get('/api/admin/destinations')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an unauthenticated admin write', async () => {
    const taxonomy = await seedTaxonomy();
    const res = await request(app).post('/api/admin/destinations').send(createPayload(taxonomy));
    expect(res.status).toBe(401);
  });

  it('returns 403 for an authenticated CUSTOMER', async () => {
    const session = await customerSession(CUSTOMER_EMAIL);

    const list = await request(app).get('/api/admin/destinations').set('Cookie', session);
    expect(list.status).toBe(403);
    expect(list.body.code).toBe('FORBIDDEN_ROLE');

    const taxonomy = await seedTaxonomy();
    const write = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', session)
      .send(createPayload(taxonomy));
    expect(write.status).toBe(403);
  });

  it('allows the CONTENT role through', async () => {
    const session = await adminSession(CONTENT_EMAIL);
    const res = await request(app).get('/api/admin/destinations').set('Cookie', session);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it('shows DRAFT and ARCHIVED content to CONTENT but not to the public', async () => {
    const taxonomy = await seedTaxonomy();
    await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'DRAFT', slug: 'draft-one' })
    );
    const session = await adminSession(CONTENT_EMAIL);

    const admin = await request(app).get('/api/admin/destinations').set('Cookie', session);
    const publicList = await request(app).get('/api/destinations');

    expect(admin.body.data.items).toHaveLength(1);
    expect(admin.body.data.items[0].status).toBe('DRAFT');
    expect(publicList.body.data.items).toHaveLength(0);
  });

  it('a CONTENT user can read a DRAFT destination by id', async () => {
    const taxonomy = await seedTaxonomy();
    const created = await destinationRepository.create(
      destinationBody({ districtId: taxonomy.district._id, status: 'DRAFT' })
    );
    const session = await adminSession(CONTENT_EMAIL);

    const res = await request(app).get(`/api/admin/destinations/${created._id}`).set('Cookie', session);

    expect(res.status).toBe(200);
    expect(res.body.data.destination.status).toBe('DRAFT');
  });
});

describe('POST /api/admin/destinations — validation', () => {
  async function createAs(body) {
    const session = await adminSession(CONTENT_EMAIL);
    return request(app).post('/api/admin/destinations').set('Cookie', session).send(body);
  }

  it('rejects a malformed slug with 400 VALIDATION_ERROR', async () => {
    const taxonomy = await seedTaxonomy();
    const res = await createAs(createPayload(taxonomy, { slug: 'Not A Slug!' }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.some((d) => d.field === 'slug')).toBe(true);
  });

  it('rejects a missing districtId with 400 VALIDATION_ERROR', async () => {
    const taxonomy = await seedTaxonomy();
    const payload = createPayload(taxonomy);
    delete payload.districtId;

    const res = await createAs(payload);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.some((d) => d.field === 'districtId')).toBe(true);
  });

  it('rejects missing SEO fields with 400 VALIDATION_ERROR', async () => {
    const taxonomy = await seedTaxonomy();
    const payload = createPayload(taxonomy);
    delete payload.seoTitle;
    delete payload.metaDescription;
    delete payload.canonicalUrl;

    const res = await createAs(payload);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toContain('seoTitle');
    expect(fields).toContain('metaDescription');
    expect(fields).toContain('canonicalUrl');
  });

  it('rejects a non-existent districtId with 400', async () => {
    const taxonomy = await seedTaxonomy();
    const res = await createAs(createPayload(taxonomy, { districtId: 'no-such-district' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/district does not exist/i);
    expect(res.body.details.some((d) => d.field === 'districtId')).toBe(true);
  });

  it('rejects a non-existent categoryId with 400', async () => {
    const taxonomy = await seedTaxonomy();
    const res = await createAs(createPayload(taxonomy, { categoryIds: ['no-such-category'] }));

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'categoryIds')).toBe(true);
  });

  it('writes nothing when validation or referential integrity fails', async () => {
    const taxonomy = await seedTaxonomy();
    const badSlug = await createAs(createPayload(taxonomy, { slug: 'Not A Slug!' }));
    const badDistrict = await createAs(createPayload(taxonomy, { districtId: 'no-such-district' }));
    const badCategory = await createAs(createPayload(taxonomy, { categoryIds: ['no-such-category'] }));

    expect(badSlug.status).toBe(400);
    expect(badDistrict.status).toBe(400);
    expect(badCategory.status).toBe(400);

    // No half-written destination, and no slug claim burned on a failed write.
    const snapshot = await getFirestore().collection('destinations').get();
    expect(snapshot.size).toBe(0);

    const claims = await getFirestore().collection('slugClaims').get();
    expect(claims.docs.map((d) => d.id)).not.toContain('lonavala');
  });

  it('rejects a duplicate slug with 409', async () => {
    const taxonomy = await seedTaxonomy();
    const first = await createAs(createPayload(taxonomy));
    expect(first.status).toBe(201);

    const second = await createAs(createPayload(taxonomy, { name: 'Impostor' }));
    expect(second.status).toBe(409);
  });
});

describe('POST /api/admin/destinations — lifecycle', () => {
  it('creates a destination and audits it', async () => {
    const taxonomy = await seedTaxonomy();
    const session = await adminSession(CONTENT_EMAIL);

    const res = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', session)
      .send(createPayload(taxonomy));

    expect(res.status).toBe(201);
    expect(res.body.data.destination.slug).toBe('lonavala');
    expect(res.body.data.destination.status).toBe('DRAFT');

    const actions = await auditActions();
    const created = actions.find((a) => a.action === 'DESTINATION_CREATED');
    expect(created).toBeTruthy();
    expect(created.entityType).toBe('Destination');
    expect(created.entityId).toBe(res.body.data.destination.id);
    expect(created.actorRole).toBe(ROLES.CONTENT);
    expect(created.actorId).toBeTruthy();
  });

  it('publishes a destination and makes it publicly visible', async () => {
    const taxonomy = await seedTaxonomy();
    const session = await adminSession(CONTENT_EMAIL);

    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', session)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    expect((await request(app).get('/api/destinations/lonavala')).status).toBe(404);

    const published = await request(app)
      .post(`/api/admin/destinations/${id}/publish`)
      .set('Cookie', session);

    expect(published.status).toBe(200);
    expect(published.body.data.destination.status).toBe('PUBLISHED');
    expect(published.body.data.destination.publishedAt).toBeTruthy();

    const publicRes = await request(app).get('/api/destinations/lonavala');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.destination.slug).toBe('lonavala');

    const list = await request(app).get('/api/destinations');
    expect(list.body.data.items.map((d) => d.slug)).toEqual(['lonavala']);
  });

  it('audits the publish transition', async () => {
    const taxonomy = await seedTaxonomy();
    const session = await adminSession(CONTENT_EMAIL);

    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', session)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', session);

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'DESTINATION_CREATED')).toBe(true);

    const published = actions.find((a) => a.action === 'DESTINATION_PUBLISHED');
    expect(published).toBeTruthy();
    expect(published.entityId).toBe(id);
    expect(published.actorId).toBeTruthy();
    expect(published.actorRole).toBe(ROLES.CONTENT);
  });

  it('refuses to feature a DRAFT destination with 400', async () => {
    const taxonomy = await seedTaxonomy();
    const session = await adminSession(CONTENT_EMAIL);

    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', session)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    const res = await request(app)
      .post(`/api/admin/destinations/${id}/feature`)
      .set('Cookie', session)
      .send({ featured: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/published/i);

    // The flag must not have been written either.
    const stored = await destinationRepository.get(id);
    expect(stored.featured).toBe(false);
  });

  it('features a PUBLISHED destination and audits it', async () => {
    const taxonomy = await seedTaxonomy();
    const session = await adminSession(CONTENT_EMAIL);

    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', session)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', session);
    const res = await request(app)
      .post(`/api/admin/destinations/${id}/feature`)
      .set('Cookie', session)
      .send({ featured: true });

    expect(res.status).toBe(200);
    expect(res.body.data.destination.featured).toBe(true);

    const featured = await request(app).get('/api/destinations?featured=true');
    expect(featured.body.data.items.map((d) => d.slug)).toEqual(['lonavala']);

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'DESTINATION_FEATURED')).toBe(true);
  });

  it('unpublishes and hides the destination from the public again', async () => {
    const taxonomy = await seedTaxonomy();
    const session = await adminSession(CONTENT_EMAIL);

    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', session)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', session);
    expect((await request(app).get('/api/destinations/lonavala')).status).toBe(200);

    const unpublished = await request(app)
      .post(`/api/admin/destinations/${id}/unpublish`)
      .set('Cookie', session);

    expect(unpublished.status).toBe(200);
    expect((await request(app).get('/api/destinations/lonavala')).status).toBe(404);
  });

  it('returns 404 when publishing an unknown destination', async () => {
    const session = await adminSession(CONTENT_EMAIL);
    const res = await request(app).post('/api/admin/destinations/no-such-id/publish').set('Cookie', session);
    expect(res.status).toBe(404);
  });
});
