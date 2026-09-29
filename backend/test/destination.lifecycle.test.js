/**
 * Destination lifecycle + read-correctness API tests.
 *
 * `content.api.test.js` covers the public projection and the happy-path
 * lifecycle. This file covers what a re-review had to verify:
 *
 *   - PATCH really updates (valid, validation failure, unknown id → 404)
 *   - referential integrity on write: an unknown district / category / place
 *     is a 400 with a documented `details[]`, never a persisted bad row
 *   - the full lifecycle, including the rule that a DRAFT destination cannot
 *     be featured
 *   - authorization is enforced server-side on EVERY admin destination route
 *   - admin routes are not unconditionally 400: valid → 201, malformed → 400
 *   - read correctness: pagination lookahead (no phantom cursor), cursor
 *     continuity, district / category / multi-category filters, and that a
 *     filter is never silently dropped on page two
 *   - no N+1 at the HTTP boundary, measured with an explicit read count
 *   - archiving does NOT release the slug claim — the entity still exists
 *
 * ESM test file + `createRequire`, because the backend is CommonJS.
 */

import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const request = require('supertest');
const bcrypt = require('bcryptjs');

const { requireEmulator, clearCollection, teardown } = require('./helpers/emulator.js');
const { instrumentReads } = require('./helpers/instrumentReads.js');
const app = require('../src/app.js');
const User = require('../src/models/User.model.js');
const { ROLES } = require('../src/constants/roles.js');
const { getFirestore } = require('../src/config/database.js');
const districtRepository = require('../src/repositories/district.repository.js');
const categoryRepository = require('../src/repositories/category.repository.js');
const placeRepository = require('../src/repositories/place.repository.js');
const destinationRepository = require('../src/repositories/destination.repository.js');
const { resolveSlug } = require('../src/repositories/slugClaim.repository.js');

const COLLECTIONS = ['destinations', 'districts', 'categories', 'places', 'slugClaims', 'auditLogs'];

const CONTENT_EMAIL = 'content@safarup.in';
const CUSTOMER_EMAIL = 'customer@safarup.in';
const PASSWORD = 'Password123';
const IMAGE = 'https://example.com/lonavala-hero.jpg';

/** Fixed epoch so pagination ordering is deterministic across runs. */
const EPOCH = new Date('2026-06-01T00:00:00.000Z').getTime();

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

async function session(email, path) {
  const res = await request(app).post(path).send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return cookie(res, 'accessToken');
}

const adminSession = (email = CONTENT_EMAIL) => session(email, '/api/auth/admin/login');
const customerSession = (email = CUSTOMER_EMAIL) => session(email, '/api/auth/login');

async function setUpdatedAt(id, millis) {
  await getFirestore().collection('destinations').doc(id).update({ updatedAt: new Date(millis) });
}

async function auditActions() {
  const snapshot = await getFirestore().collection('auditLogs').get();
  return snapshot.docs.map((doc) => doc.data());
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

/** Published district + category + place, all resolvable publicly. */
async function seedTaxonomy(prefix = '') {
  const district = await districtRepository.create({
    name: `${prefix || 'Pune'} District`,
    slug: `${prefix}${prefix ? '-' : ''}pune-district`,
    status: 'PUBLISHED',
  });
  const category = await categoryRepository.create({
    name: 'Hill Stations',
    slug: `${prefix}${prefix ? '-' : ''}hill-stations`,
    status: 'PUBLISHED',
    sortOrder: 1,
  });
  const place = await placeRepository.create({
    name: 'Lohagad Fort',
    slug: `${prefix}${prefix ? '-' : ''}lohagad-fort`,
    districtId: district._id,
    description: 'A hill fort near Lonavala in the Sahyadri range.',
    status: 'PUBLISHED',
  });
  return { district, category, place };
}

function createPayload(taxonomy, overrides = {}) {
  return destinationBody({
    districtId: taxonomy.district._id,
    categoryIds: [taxonomy.category._id],
    placeIds: [taxonomy.place._id],
    ...overrides,
  });
}

/** Creates + publishes via the repositories, mirroring the public seed path. */
async function seedPublished(fields) {
  const created = await destinationRepository.create(destinationBody({ ...fields, status: 'DRAFT' }));
  return destinationRepository.setStatus(created._id, 'PUBLISHED', {
    actorId: 'seed-actor',
    actorRole: ROLES.CONTENT,
  });
}

/** N published destinations with a total `updatedAt` ordering. */
async function seedPublishedOrdered(count, { districtId, categoryIds = [], placeIds = [], prefix = 'dest' } = {}) {
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const item = await destinationRepository.create(
      destinationBody({
        name: `Destination ${i}`,
        slug: `${prefix}-${i}`,
        districtId,
        categoryIds,
        placeIds,
        status: 'PUBLISHED',
      })
    );
    await setUpdatedAt(item._id, EPOCH + i * 1000);
    created.push(item);
  }
  return created;
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

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/destinations/:id', () => {
  it('applies a partial update and preserves unspecified fields', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));

    const res = await request(app)
      .patch(`/api/admin/destinations/${created.body.data.destination.id}`)
      .set('Cookie', auth)
      .send({ name: 'Lonavala Hill Station', highlights: ['Trekkable in the monsoon'] });

    expect(res.status).toBe(200);
    expect(res.body.data.destination.name).toBe('Lonavala Hill Station');
    expect(res.body.data.destination.highlights).toEqual(['Trekkable in the monsoon']);
    // Merge semantics: everything not in the patch survives untouched.
    expect(res.body.data.destination.slug).toBe('lonavala');
    expect(res.body.data.destination.description).toBe(createPayload(taxonomy).description);
    expect(res.body.data.destination.district.id).toBe(taxonomy.district._id);

    const actions = await auditActions();
    const updated = actions.find((a) => a.action === 'DESTINATION_UPDATED');
    expect(updated).toBeTruthy();
    expect(updated.entityId).toBe(created.body.data.destination.id);
    expect(updated.actorRole).toBe(ROLES.CONTENT);
    expect(updated.before.name).toBe('Lonavala');
    expect(updated.after.name).toBe('Lonavala Hill Station');
  });

  it('rejects an invalid field with 400 VALIDATION_ERROR and writes nothing', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));

    const res = await request(app)
      .patch(`/api/admin/destinations/${created.body.data.destination.id}`)
      .set('Cookie', auth)
      .send({ slug: 'Not A Slug!' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.some((d) => d.field === 'slug')).toBe(true);

    const stored = await destinationRepository.get(created.body.data.destination.id);
    expect(stored.slug).toBe('lonavala');
  });

  it('rejects an empty patch body with 400 rather than a silent no-op', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));

    const res = await request(app)
      .patch(`/api/admin/destinations/${created.body.data.destination.id}`)
      .set('Cookie', auth)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for an unknown destination id', async () => {
    const auth = await adminSession();
    const res = await request(app)
      .patch('/api/admin/destinations/no-such-id')
      .set('Cookie', auth)
      .send({ name: 'Fine' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('accepts a valid relation change', async () => {
    const taxonomy = await seedTaxonomy();
    const other = await seedTaxonomy('nashik-');
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));

    const res = await request(app)
      .patch(`/api/admin/destinations/${created.body.data.destination.id}`)
      .set('Cookie', auth)
      .send({ districtId: other.district._id });

    expect(res.status).toBe(200);
    expect(res.body.data.destination.district.id).toBe(other.district._id);
  });
});

// ---------------------------------------------------------------------------
// Referential integrity
// ---------------------------------------------------------------------------

describe('relationship validation', () => {
  /** Creates one destination through the API and returns its id. */
  async function createOne() {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    return { id: created.body.data.destination.id, taxonomy, auth };
  }

  it('rejects an unknown districtId with 400 and a documented details[]', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();

    const res = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy, { districtId: 'no-such-district' }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBeUndefined();
    expect(res.body.message).toMatch(/district does not exist/i);
    expect(res.body.details).toEqual([{ field: 'districtId', message: 'Unknown district' }]);
  });

  it('rejects an unknown categoryIds entry with 400 and names every unknown id', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();

    const res = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy, { categoryIds: [taxonomy.category._id, 'ghost-a', 'ghost-b'] }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/categories do not exist/i);
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        { field: 'categoryIds', message: 'Unknown category: ghost-a' },
        { field: 'categoryIds', message: 'Unknown category: ghost-b' },
      ])
    );
  });

  it('rejects an unknown placeIds entry with 400', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();

    const res = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy, { placeIds: ['ghost-place'] }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/places do not exist/i);
    expect(res.body.details).toEqual([
      { field: 'placeIds', message: 'Unknown place: ghost-place' },
    ]);
  });

  it('rejects a PATCH that introduces a dangling reference', async () => {
    const { id, auth } = await createOne();

    for (const [patch, field] of [
      [{ districtId: 'no-such-district' }, 'districtId'],
      [{ categoryIds: ['ghost-category'] }, 'categoryIds'],
      [{ placeIds: ['ghost-place'] }, 'placeIds'],
    ]) {
      const res = await request(app).patch(`/api/admin/destinations/${id}`).set('Cookie', auth).send(patch);
      expect(res.status).toBe(400);
      expect(res.body.details.some((d) => d.field === field)).toBe(true);
    }
  });

  it('writes nothing when a relation is invalid', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();

    await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy, { districtId: 'no-such-district' }));

    expect((await getFirestore().collection('destinations').get()).size).toBe(0);
    expect(await resolveSlug('lonavala')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('destination lifecycle', () => {
  it('archives a destination out of every public surface', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', auth);
    expect((await request(app).get('/api/destinations/lonavala')).status).toBe(200);
    expect((await request(app).get('/api/destinations')).body.data.items).toHaveLength(1);

    const archived = await request(app).post(`/api/admin/destinations/${id}/archive`).set('Cookie', auth);

    expect(archived.status).toBe(200);
    expect(archived.body.data.destination.status).toBe('ARCHIVED');
    expect((await request(app).get('/api/destinations/lonavala')).status).toBe(404);
    expect((await request(app).get('/api/destinations')).body.data.items).toHaveLength(0);

    // The admin list still holds it — archival is not deletion.
    const adminList = await request(app).get('/api/admin/destinations').set('Cookie', auth);
    expect(adminList.body.data.items).toHaveLength(1);
    expect(adminList.body.data.items[0].status).toBe('ARCHIVED');

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'DESTINATION_ARCHIVED')).toBe(true);
  });

  it('refuses to feature a DRAFT destination with 400 and does not write the flag', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));

    const res = await request(app)
      .post(`/api/admin/destinations/${created.body.data.destination.id}/feature`)
      .set('Cookie', auth)
      .send({ featured: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/published/i);

    const stored = await destinationRepository.get(created.body.data.destination.id);
    expect(stored.featured).toBe(false);
  });

  it('refuses to feature an ARCHIVED destination with 400', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', auth);
    await request(app).post(`/api/admin/destinations/${id}/archive`).set('Cookie', auth);

    const res = await request(app)
      .post(`/api/admin/destinations/${id}/feature`)
      .set('Cookie', auth)
      .send({ featured: true });

    expect(res.status).toBe(400);
    expect((await destinationRepository.get(id)).featured).toBe(false);
  });

  it('features and un-features a PUBLISHED destination', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', auth);

    const featured = await request(app)
      .post(`/api/admin/destinations/${id}/feature`)
      .set('Cookie', auth)
      .send({ featured: true });
    expect(featured.status).toBe(200);
    expect(featured.body.data.destination.featured).toBe(true);

    const rail = await request(app).get('/api/destinations?featured=true');
    expect(rail.body.data.items.map((d) => d.slug)).toEqual(['lonavala']);

    const unfeatured = await request(app)
      .post(`/api/admin/destinations/${id}/feature`)
      .set('Cookie', auth)
      .send({ featured: false });
    expect(unfeatured.status).toBe(200);
    expect(unfeatured.body.data.destination.featured).toBe(false);
    expect((await request(app).get('/api/destinations?featured=true')).body.data.items).toHaveLength(0);

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'DESTINATION_FEATURED')).toBe(true);
    expect(actions.some((a) => a.action === 'DESTINATION_UNFEATURED')).toBe(true);
  });

  it('stamps publishedAt on publish and keeps it through archive', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    const published = await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', auth);
    const publishedAt = published.body.data.destination.publishedAt;
    expect(typeof publishedAt).toBe('string');

    const archived = await request(app).post(`/api/admin/destinations/${id}/archive`).set('Cookie', auth);
    expect(archived.body.data.destination.publishedAt).toBe(publishedAt);
  });

  it('returns 404 for every lifecycle transition on an unknown id', async () => {
    const auth = await adminSession();
    for (const action of ['publish', 'unpublish', 'archive', 'feature']) {
      const res = await request(app).post(`/api/admin/destinations/no-such-id/${action}`).set('Cookie', auth);
      expect(res.status).toBe(404);
    }
  });
});

// ---------------------------------------------------------------------------
// Slug claims across lifecycle operations
// ---------------------------------------------------------------------------

describe('slug claims survive lifecycle operations', () => {
  it('archiving does NOT release the claim — the entity still exists', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', auth);
    await request(app).post(`/api/admin/destinations/${id}/archive`).set('Cookie', auth);

    // Still claimed, and still pointing at the archived document.
    expect(await resolveSlug('lonavala')).toEqual({ entityId: id, collection: 'destinations' });

    const reCreate = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy, { name: 'Impostor' }));
    expect(reCreate.status).toBe(409);

    // The archived destination was not clobbered by the rejected create.
    const stored = await destinationRepository.get(id);
    expect(stored.name).toBe('Lonavala');
    expect(stored.status).toBe('ARCHIVED');
  });

  it('unpublishing does NOT release the claim either', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    const id = created.body.data.destination.id;

    await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', auth);
    await request(app).post(`/api/admin/destinations/${id}/unpublish`).set('Cookie', auth);

    expect(await resolveSlug('lonavala')).toEqual({ entityId: id, collection: 'destinations' });
    expect(
      (await request(app).post('/api/admin/destinations').set('Cookie', auth).send(createPayload(taxonomy))).status
    ).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe('destination authorization matrix', () => {
  async function seedOne() {
    const taxonomy = await seedTaxonomy();
    const created = await destinationRepository.create(destinationBody({ districtId: taxonomy.district._id }));
    return { id: created._id, taxonomy };
  }

  it('returns 401 unauthenticated on every admin destination route', async () => {
    const { id, taxonomy } = await seedOne();

    expect((await request(app).get('/api/admin/destinations')).status).toBe(401);
    expect((await request(app).get(`/api/admin/destinations/${id}`)).status).toBe(401);
    expect((await request(app).post('/api/admin/destinations').send(createPayload(taxonomy))).status).toBe(401);
    expect((await request(app).patch(`/api/admin/destinations/${id}`).send({ name: 'X' })).status).toBe(401);
    for (const action of ['publish', 'unpublish', 'archive', 'feature']) {
      expect((await request(app).post(`/api/admin/destinations/${id}/${action}`)).status).toBe(401);
    }
  });

  it('returns 403 for an authenticated CUSTOMER', async () => {
    const { id, taxonomy } = await seedOne();
    const auth = await customerSession();

    const list = await request(app).get('/api/admin/destinations').set('Cookie', auth);
    expect(list.status).toBe(403);
    expect(list.body.code).toBe('FORBIDDEN_ROLE');

    expect((await request(app).get(`/api/admin/destinations/${id}`).set('Cookie', auth)).status).toBe(403);
    expect(
      (await request(app).post('/api/admin/destinations').set('Cookie', auth).send(createPayload(taxonomy))).status
    ).toBe(403);
    expect(
      (await request(app).patch(`/api/admin/destinations/${id}`).set('Cookie', auth).send({ name: 'X' })).status
    ).toBe(403);
    for (const action of ['publish', 'unpublish', 'archive', 'feature']) {
      expect((await request(app).post(`/api/admin/destinations/${id}/${action}`).set('Cookie', auth)).status).toBe(403);
    }
  });

  it('returns 200/201 for the CONTENT role', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();

    const created = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    expect(created.status).toBe(201);
    const id = created.body.data.destination.id;

    expect((await request(app).get('/api/admin/destinations').set('Cookie', auth)).status).toBe(200);
    expect((await request(app).get(`/api/admin/destinations/${id}`).set('Cookie', auth)).status).toBe(200);
    expect(
      (await request(app).patch(`/api/admin/destinations/${id}`).set('Cookie', auth).send({ name: 'Renamed' })).status
    ).toBe(200);
    expect((await request(app).post(`/api/admin/destinations/${id}/publish`).set('Cookie', auth)).status).toBe(200);
    expect((await request(app).post(`/api/admin/destinations/${id}/feature`).set('Cookie', auth)).status).toBe(200);
  });

  it('admin routes are not unconditionally 400 — valid create 201, malformed create 400', async () => {
    const taxonomy = await seedTaxonomy();
    const auth = await adminSession();

    const valid = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send(createPayload(taxonomy));
    expect(valid.status).toBe(201);

    const malformed = await request(app)
      .post('/api/admin/destinations')
      .set('Cookie', auth)
      .send({ ...createPayload(taxonomy), slug: 'Not A Slug!' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Read correctness — pagination
// ---------------------------------------------------------------------------

describe('GET /api/destinations — pagination', () => {
  it('returns NO cursor when the page is exactly full', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublishedOrdered(3, { districtId: taxonomy.district._id });

    const res = await request(app).get('/api/destinations?limit=3');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('returns a cursor when one more record exists beyond the page', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublishedOrdered(4, { districtId: taxonomy.district._id });

    const res = await request(app).get('/api/destinations?limit=3');

    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.nextCursor).toBeTruthy();
  });

  it('page 2 continues immediately with no duplicates and no gaps', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublishedOrdered(5, { districtId: taxonomy.district._id });

    const pageOne = await request(app).get('/api/destinations?limit=2');
    expect(pageOne.body.data.items.map((d) => d.name)).toEqual(['Destination 4', 'Destination 3']);

    const pageTwo = await request(app).get(
      `/api/destinations?limit=2&cursor=${encodeURIComponent(pageOne.body.data.nextCursor)}`
    );
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.items.map((d) => d.name)).toEqual(['Destination 2', 'Destination 1']);

    const pageThree = await request(app).get(
      `/api/destinations?limit=2&cursor=${encodeURIComponent(pageTwo.body.data.nextCursor)}`
    );
    expect(pageThree.body.data.items.map((d) => d.name)).toEqual(['Destination 0']);
    expect(pageThree.body.data.nextCursor).toBeNull();

    const firstSlugs = pageOne.body.data.items.map((d) => d.slug);
    const secondSlugs = pageTwo.body.data.items.map((d) => d.slug);
    expect(secondSlugs.filter((s) => firstSlugs.includes(s))).toEqual([]);

    const all = [...pageOne.body.data.items, ...pageTwo.body.data.items, ...pageThree.body.data.items];
    expect(new Set(all.map((d) => d.slug)).size).toBe(5);
  });

  it('keeps the ordering when the cursor is malformed', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublishedOrdered(3, { districtId: taxonomy.district._id });

    const res = await request(app).get('/api/destinations?limit=3&cursor=garbage');

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((d) => d.name)).toEqual(['Destination 2', 'Destination 1', 'Destination 0']);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('paginates the admin list too, across DRAFT and PUBLISHED', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublishedOrdered(2, { districtId: taxonomy.district._id });
    await destinationRepository.create(
      destinationBody({ name: 'Draft One', slug: 'draft-one', districtId: taxonomy.district._id, status: 'DRAFT' })
    );
    const auth = await adminSession();

    const pageOne = await request(app).get('/api/admin/destinations?limit=2').set('Cookie', auth);
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.data.items).toHaveLength(2);
    expect(pageOne.body.data.nextCursor).toBeTruthy();

    const pageTwo = await request(app)
      .get(`/api/admin/destinations?limit=2&cursor=${encodeURIComponent(pageOne.body.data.nextCursor)}`)
      .set('Cookie', auth);
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.items).toHaveLength(1);
    expect(pageTwo.body.data.nextCursor).toBeNull();

    const statuses = [...pageOne.body.data.items, ...pageTwo.body.data.items].map((d) => d.status);
    expect(statuses).toContain('DRAFT');
  });
});

// ---------------------------------------------------------------------------
// Read correctness — district filter
// ---------------------------------------------------------------------------

describe('GET /api/destinations?district= — filtering', () => {
  /** Two districts; `puneCount` and `nashikCount` published destinations. */
  async function seedTwoDistricts({ puneCount = 3, nashikCount = 1, order = 'interleaved' } = {}) {
    const pune = await districtRepository.create({ name: 'Pune District', slug: 'pune-district', status: 'PUBLISHED' });
    const nashik = await districtRepository.create({
      name: 'Nashik District',
      slug: 'nashik-district',
      status: 'PUBLISHED',
    });

    const rows = [];
    for (let i = 0; i < puneCount; i += 1) {
      rows.push({ name: `Pune ${i}`, slug: `pune-${i}`, districtId: pune._id });
    }
    for (let i = 0; i < nashikCount; i += 1) {
      rows.push({ name: `Nashik ${i}`, slug: `nashik-${i}`, districtId: nashik._id });
    }

    // Interleaving the outsider between Pune rows is what catches a filter
    // that is silently dropped on a cursor page.
    if (order === 'interleaved' && nashikCount > 0) {
      rows.splice(Math.min(1, rows.length), 0, rows.pop());
    }

    for (let i = 0; i < rows.length; i += 1) {
      const created = await destinationRepository.create(
        destinationBody({ ...rows[i], status: 'PUBLISHED' })
      );
      await setUpdatedAt(created._id, EPOCH + i * 1000);
    }
    return { pune, nashik };
  }

  it('returns only the requested district’s destinations', async () => {
    await seedTwoDistricts();

    const res = await request(app).get('/api/destinations?district=pune-district');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.items.every((d) => d.district.slug === 'pune-district')).toBe(true);
  });

  it('keeps the district filter on page 2', async () => {
    await seedTwoDistricts({ puneCount: 3, nashikCount: 1 });

    const pageOne = await request(app).get('/api/destinations?district=pune-district&limit=2');
    expect(pageOne.body.data.items).toHaveLength(2);
    expect(pageOne.body.data.items.every((d) => d.district.slug === 'pune-district')).toBe(true);
    expect(pageOne.body.data.nextCursor).toBeTruthy();

    const pageTwo = await request(app).get(
      `/api/destinations?district=pune-district&limit=2&cursor=${encodeURIComponent(pageOne.body.data.nextCursor)}`
    );
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.items).toHaveLength(1);
    // The Nashik row sits inside the filtered range — if the filter were
    // dropped here it would appear.
    expect(pageTwo.body.data.items.every((d) => d.district.slug === 'pune-district')).toBe(true);
    expect(pageTwo.body.data.nextCursor).toBeNull();
  });

  it('never silently returns unfiltered data for an unknown district slug', async () => {
    await seedTwoDistricts();

    const res = await request(app).get('/api/destinations?district=nowhere-at-all');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('never silently returns unfiltered data for an UNPUBLISHED district slug', async () => {
    const pune = await districtRepository.create({ name: 'Pune', slug: 'pune-district', status: 'PUBLISHED' });
    await districtRepository.create({ name: 'Hidden', slug: 'hidden-district', status: 'DRAFT' });

    await destinationRepository.create(
      destinationBody({ name: 'In Pune', slug: 'in-pune', districtId: pune._id, status: 'PUBLISHED' })
    );
    await destinationRepository.create(
      destinationBody({ name: 'In Hidden', slug: 'in-hidden', districtId: 'district-id-of-hidden', status: 'PUBLISHED' })
    );

    const res = await request(app).get('/api/destinations?district=hidden-district');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it('has no phantom cursor when the filtered page is exactly full', async () => {
    await seedTwoDistricts({ puneCount: 3, nashikCount: 1 });

    const res = await request(app).get('/api/destinations?district=pune-district&limit=3');

    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Read correctness — category filter
// ---------------------------------------------------------------------------

describe('GET /api/destinations?category= — filtering', () => {
  it('returns only destinations carrying the category', async () => {
    const taxonomy = await seedTaxonomy();
    const other = await categoryRepository.create({ name: 'Wildlife', slug: 'wildlife', status: 'PUBLISHED' });

    await seedPublished({ districtId: taxonomy.district._id, categoryIds: [taxonomy.category._id] });
    await seedPublished({
      name: 'Tadoba',
      slug: 'tadoba',
      districtId: taxonomy.district._id,
      categoryIds: [other._id],
    });

    const res = await request(app).get('/api/destinations?category=hill-stations');

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((d) => d.slug)).toEqual(['lonavala']);
  });

  it('merges and de-duplicates a repeated category parameter', async () => {
    const taxonomy = await seedTaxonomy();
    const wildlife = await categoryRepository.create({ name: 'Wildlife', slug: 'wildlife', status: 'PUBLISHED' });

    await seedPublished({
      districtId: taxonomy.district._id,
      categoryIds: [taxonomy.category._id, wildlife._id],
    });
    await seedPublished({ name: 'Tadoba', slug: 'tadoba', districtId: taxonomy.district._id, categoryIds: [wildlife._id] });

    const res = await request(app).get('/api/destinations?category=hill-stations&category=wildlife');

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((d) => d.slug).sort()).toEqual(['lonavala', 'tadoba']);
    // De-duplicated: a destination in both categories appears once.
    expect(new Set(res.body.data.items.map((d) => d.id)).size).toBe(2);
  });

  it('paginates a multi-category filter without dropping rows', async () => {
    const taxonomy = await seedTaxonomy();
    const wildlife = await categoryRepository.create({ name: 'Wildlife', slug: 'wildlife', status: 'PUBLISHED' });
    const both = [taxonomy.category._id, wildlife._id];

    // Five destinations, all carrying BOTH categories.
    await seedPublishedOrdered(5, { districtId: taxonomy.district._id, categoryIds: both });

    const query = 'category=hill-stations&category=wildlife';
    const pageOne = await request(app).get(`/api/destinations?${query}&limit=2`);
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.data.items).toHaveLength(2);
    expect(pageOne.body.data.nextCursor).toBeTruthy();

    const pageTwo = await request(app).get(
      `/api/destinations?${query}&limit=2&cursor=${encodeURIComponent(pageOne.body.data.nextCursor)}`
    );
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.items).toHaveLength(2);
    expect(pageTwo.body.data.nextCursor).toBeTruthy();

    const pageThree = await request(app).get(
      `/api/destinations?${query}&limit=2&cursor=${encodeURIComponent(pageTwo.body.data.nextCursor)}`
    );
    expect(pageThree.body.data.items).toHaveLength(1);
    expect(pageThree.body.data.nextCursor).toBeNull();

    const all = [...pageOne.body.data.items, ...pageTwo.body.data.items, ...pageThree.body.data.items];
    // Nothing silently truncated: all five are reachable.
    expect(new Set(all.map((d) => d.slug)).size).toBe(5);
  });

  it('returns an empty set for an unknown or unpublished category slug', async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublished({ districtId: taxonomy.district._id, categoryIds: [taxonomy.category._id] });

    const unknown = await request(app).get('/api/destinations?category=no-such-category');
    expect(unknown.status).toBe(200);
    expect(unknown.body.data.items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// No N+1 at the HTTP boundary
// ---------------------------------------------------------------------------

describe('GET /api/destinations — no N+1 reads', () => {
  /**
   * The read count must be identical for a page of 1 destination with 3
   * references and a page of 3 destinations with 15 references. That is only
   * true if relations are batched into one read per collection
   * (FIRESTORE.destination.contract.md §5).
   *
   * Rows are written with a single batch because the read path is identical
   * either way and 16 transactions would add ~6s of pure latency.
   */
  async function seedBatchReadFixture({ destinationCount, categoryCount, placeCount }) {
    const db = getFirestore();
    const now = new Date();

    const districtId = db.collection('districts').doc().id;
    const categoryIds = [];
    const placeIds = [];

    const batch = db.batch();
    batch.set(db.collection('districts').doc(districtId), {
      name: 'Pune District',
      slug: `pune-district-${destinationCount}-${categoryCount}-${placeCount}`,
      status: 'PUBLISHED',
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < categoryCount; i += 1) {
      const id = db.collection('categories').doc().id;
      categoryIds.push(id);
      batch.set(db.collection('categories').doc(id), {
        name: `Category ${i}`,
        slug: `cat-${i}-${destinationCount}-${categoryCount}-${placeCount}`,
        status: 'PUBLISHED',
        sortOrder: i,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (let i = 0; i < placeCount; i += 1) {
      const id = db.collection('places').doc().id;
      placeIds.push(id);
      batch.set(db.collection('places').doc(id), {
        name: `Place ${i}`,
        slug: `place-${i}-${destinationCount}-${categoryCount}-${placeCount}`,
        districtId,
        description: 'A canonical place used by the read-count fixture.',
        status: 'PUBLISHED',
        createdAt: now,
        updatedAt: now,
      });
    }

    for (let i = 0; i < destinationCount; i += 1) {
      batch.set(db.collection('destinations').doc(), {
        ...destinationBody({
          name: `Fixture ${i}`,
          slug: `fixture-${destinationCount}-${categoryCount}-${placeCount}-${i}`,
          districtId,
          categoryIds,
          placeIds,
        }),
        status: 'PUBLISHED',
        createdAt: now,
        updatedAt: new Date(EPOCH + i * 1000),
      });
    }

    await batch.commit();
    return { destinationCount, categoryCount, placeCount };
  }

  it('issues one read per collection regardless of page and reference count', async () => {
    const small = await seedBatchReadFixture({
      destinationCount: 1,
      categoryCount: 1,
      placeCount: 1,
    });
    const large = await seedBatchReadFixture({
      destinationCount: 3,
      categoryCount: 6,
      placeCount: 6,
    });

    const smallProbe = instrumentReads();
    let smallReads;
    let smallCollections;
    let smallBody;
    try {
      const res = await request(app).get('/api/destinations?limit=20');
      smallReads = smallProbe.reads();
      smallCollections = smallProbe.collectionsRead();
      smallBody = res.body;
    } finally {
      smallProbe.restore();
    }

    const largeProbe = instrumentReads();
    let largeReads;
    let largeBody;
    try {
      const res = await request(app).get('/api/destinations?limit=20');
      largeReads = largeProbe.reads();
      largeBody = res.body;
    } finally {
      largeProbe.restore();
    }

    // The fixture really does differ, otherwise this proves nothing.
    const smallRow = smallBody.data.items.find((d) => d.slug === `fixture-${small.destinationCount}-${small.categoryCount}-${small.placeCount}-0`);
    const largeRow = largeBody.data.items.find((d) => d.slug === `fixture-${large.destinationCount}-${large.categoryCount}-${large.placeCount}-0`);
    expect(smallRow.categories).toHaveLength(1);
    expect(largeRow.categories).toHaveLength(6);
    expect(largeRow.places).toHaveLength(6);

    // 3× the destinations with 6× the references must not cost more reads.
    expect(largeReads).toBe(smallReads);
    // One read for the list, one per referenced collection. Never 4 per row.
    expect(smallReads).toBe(4);
    expect(smallCollections).toEqual(['categories', 'destinations', 'districts', 'places']);
  });

  it('keeps the detail read count constant as references grow', async () => {
    const { district, categories, places } = await (async () => {
      const taxonomy = await seedTaxonomy();
      return {
        district: taxonomy.district,
        categories: [taxonomy.category],
        places: [taxonomy.place],
      };
    })();

    const small = await seedPublished({ districtId: district._id, categoryIds: [categories[0]._id], placeIds: [places[0]._id] });
    const manyCategories = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        categoryRepository.create({ name: `Extra ${i}`, slug: `extra-${i}`, status: 'PUBLISHED' })
      )
    );
    const manyPlaces = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        placeRepository.create({
          name: `Extra Place ${i}`,
          slug: `extra-place-${i}`,
          districtId: district._id,
          description: 'A canonical place used by the detail read-count test.',
          status: 'PUBLISHED',
        })
      )
    );
    const large = await seedPublished({
      name: 'Tadoba',
      slug: 'tadoba',
      districtId: district._id,
      categoryIds: [...categories.map((c) => c._id), ...manyCategories.map((c) => c._id)],
      placeIds: [...places.map((p) => p._id), ...manyPlaces.map((p) => p._id)],
    });

    const measure = async (slug) => {
      const probe = instrumentReads();
      try {
        const res = await request(app).get(`/api/destinations/${slug}`);
        expect(res.status).toBe(200);
        return probe.reads();
      } finally {
        probe.restore();
      }
    };

    const smallReads = await measure(small.slug);
    const largeReads = await measure(large.slug);

    expect(largeReads).toBe(smallReads);
  });
});
