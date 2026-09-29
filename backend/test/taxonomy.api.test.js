/**
 * Taxonomy API tests — District, Category, Place.
 *
 * Covers the HTTP surface for the three canonical taxonomy entities:
 *
 *   - admin routes are genuinely wired: a valid create returns 201 and a
 *     malformed one returns 400 VALIDATION_ERROR (they are not
 *     unconditionally rejecting every request)
 *   - the full create / list / read-by-slug / update / lifecycle cycle
 *   - authorization is enforced server-side (401 unauthenticated, 403
 *     CUSTOMER, 200 CONTENT) — hiding a button is not authorization
 *   - a Place must reference a District that exists; a dangling reference is
 *     a 400 with a documented `details[]`, never a persisted bad row
 *   - a public read of non-PUBLISHED content is 404, not 403 — existence of
 *     unpublished content is never disclosed
 *   - district pagination is real: no phantom cursor on an exactly-full page
 *     and page 2 continues where page 1 stopped
 *   - archiving does not release the slug claim — the entity still exists
 *
 * ESM test file + `createRequire`, because the backend is CommonJS.
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
const { resolveSlug } = require('../src/repositories/slugClaim.repository.js');

const COLLECTIONS = ['destinations', 'districts', 'categories', 'places', 'slugClaims', 'auditLogs'];

const CONTENT_EMAIL = 'content@safarup.in';
const CUSTOMER_EMAIL = 'customer@safarup.in';
const PASSWORD = 'Password123';

/** Fixed epoch so pagination ordering is deterministic across runs. */
const EPOCH = new Date('2026-05-01T00:00:00.000Z').getTime();

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

/** Forces a known `updatedAt` so pagination ordering is deterministic. */
async function setUpdatedAt(collection, id, millis) {
  await getFirestore().collection(collection).doc(id).update({ updatedAt: new Date(millis) });
}

async function auditActions() {
  const snapshot = await getFirestore().collection('auditLogs').get();
  return snapshot.docs.map((doc) => doc.data());
}

/** A published district, the parent every Place needs. */
function seedDistrict(overrides = {}) {
  return districtRepository.create({
    name: 'Pune District',
    slug: 'pune-district',
    status: 'PUBLISHED',
    ...overrides,
  });
}

function placeBody(districtId, overrides = {}) {
  return {
    name: 'Lohagad Fort',
    slug: 'lohagad-fort',
    districtId,
    description: 'A hill fort near Lonavala in the Sahyadri range.',
    ...overrides,
  };
}

/** Drives the `limit` N districts with a total ordering. */
async function seedOrderedDistricts(count, { status = 'PUBLISHED', prefix = 'district' } = {}) {
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const item = await districtRepository.create({
      name: `District ${i}`,
      slug: `${prefix}-${i}`,
      status,
    });
    await setUpdatedAt('districts', item._id, EPOCH + i * 1000);
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
// Admin route sanity
// ---------------------------------------------------------------------------

describe('admin taxonomy routes are not unconditionally 400', () => {
  it('POST /api/admin/districts — valid body is 201, malformed body is 400', async () => {
    const auth = await adminSession();

    const created = await request(app)
      .post('/api/admin/districts')
      .set('Cookie', auth)
      .send({ name: 'Pune District', slug: 'pune-district' });

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.data.district.slug).toBe('pune-district');
    expect(created.body.data.district.status).toBe('DRAFT');

    const malformed = await request(app)
      .post('/api/admin/districts')
      .set('Cookie', auth)
      .send({ name: 'Broken', slug: 'Not A Slug!' });

    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe('VALIDATION_ERROR');
    expect(malformed.body.details.some((d) => d.field === 'slug')).toBe(true);
  });

  it('POST /api/admin/categories — valid body is 201, malformed body is 400', async () => {
    const auth = await adminSession();

    const created = await request(app)
      .post('/api/admin/categories')
      .set('Cookie', auth)
      .send({ name: 'Hill Stations', slug: 'hill-stations', sortOrder: 1 });

    expect(created.status).toBe(201);
    expect(created.body.data.category.sortOrder).toBe(1);

    const malformed = await request(app)
      .post('/api/admin/categories')
      .set('Cookie', auth)
      .send({ name: 'Broken' });

    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe('VALIDATION_ERROR');
    expect(malformed.body.details.some((d) => d.field === 'slug')).toBe(true);
  });

  it('POST /api/admin/places — valid body is 201, malformed body is 400', async () => {
    const district = await seedDistrict();
    const auth = await adminSession();

    const created = await request(app)
      .post('/api/admin/places')
      .set('Cookie', auth)
      .send(placeBody(district._id));

    expect(created.status).toBe(201);
    expect(created.body.data.place.slug).toBe('lohagad-fort');

    const malformed = await request(app)
      .post('/api/admin/places')
      .set('Cookie', auth)
      .send({ name: 'Broken', slug: 'broken' });

    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe('VALIDATION_ERROR');
    // The body validator really is the place schema, not a stub.
    const fields = malformed.body.details.map((d) => d.field);
    expect(fields).toContain('districtId');
    expect(fields).toContain('description');
  });

  it('rejects an empty PATCH body with 400 rather than a silent no-op', async () => {
    const district = await seedDistrict();
    const auth = await adminSession();

    const res = await request(app)
      .patch(`/api/admin/districts/${district._id}`)
      .set('Cookie', auth)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// District
// ---------------------------------------------------------------------------

describe('District', () => {
  it('lists only PUBLISHED districts publicly and every status to CONTENT', async () => {
    await districtRepository.create({ name: 'Draft One', slug: 'draft-one', status: 'DRAFT' });
    await districtRepository.create({ name: 'Live One', slug: 'live-one', status: 'PUBLISHED' });
    const auth = await adminSession();

    const publicRes = await request(app).get('/api/districts');
    const adminRes = await request(app).get('/api/admin/districts').set('Cookie', auth);

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.items.map((d) => d.slug)).toEqual(['live-one']);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.items.map((d) => d.slug).sort()).toEqual(['draft-one', 'live-one']);
  });

  it('reads a published district by slug', async () => {
    const district = await districtRepository.create({ name: 'Pune District', slug: 'pune-district', status: 'DRAFT' });
    const auth = await adminSession();
    await request(app).post(`/api/admin/districts/${district._id}/publish`).set('Cookie', auth);

    const res = await request(app).get('/api/districts/pune-district');

    expect(res.status).toBe(200);
    expect(res.body.data.district).toEqual({
      id: district._id,
      slug: 'pune-district',
      name: 'Pune District',
      status: 'PUBLISHED',
      updatedAt: expect.any(String),
    });
  });

  it('returns 404 for a DRAFT slug — not 403, not 200', async () => {
    await districtRepository.create({ name: 'Hidden', slug: 'hidden-district', status: 'DRAFT' });

    const res = await request(app).get('/api/districts/hidden-district');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for an unknown slug', async () => {
    expect((await request(app).get('/api/districts/never-existed')).status).toBe(404);
  });

  it('reads a DRAFT district by id for CONTENT only', async () => {
    const district = await districtRepository.create({ name: 'Draft', slug: 'draft-district', status: 'DRAFT' });
    const auth = await adminSession();

    const res = await request(app).get(`/api/admin/districts/${district._id}`).set('Cookie', auth);

    expect(res.status).toBe(200);
    expect(res.body.data.district.status).toBe('DRAFT');
    expect((await request(app).get(`/api/admin/districts/${district._id}`)).status).toBe(401);
  });

  it('returns 404 for an unknown id', async () => {
    const auth = await adminSession();
    const res = await request(app).get('/api/admin/districts/no-such-id').set('Cookie', auth);
    expect(res.status).toBe(404);
  });

  it('PATCHes a partial update and preserves unspecified fields', async () => {
    const district = await seedDistrict();
    const auth = await adminSession();

    const res = await request(app)
      .patch(`/api/admin/districts/${district._id}`)
      .set('Cookie', auth)
      .send({ name: 'Pune Region' });

    expect(res.status).toBe(200);
    expect(res.body.data.district.name).toBe('Pune Region');
    expect(res.body.data.district.slug).toBe('pune-district');
    expect(res.body.data.district.status).toBe('PUBLISHED');

    const actions = await auditActions();
    const updated = actions.find((a) => a.action === 'DISTRICT_UPDATED');
    expect(updated).toBeTruthy();
    expect(updated.entityType).toBe('District');
    expect(updated.entityId).toBe(district._id);
  });

  it('returns 400 for an invalid PATCH and 404 for an unknown id', async () => {
    const district = await seedDistrict();
    const auth = await adminSession();

    const invalid = await request(app)
      .patch(`/api/admin/districts/${district._id}`)
      .set('Cookie', auth)
      .send({ name: 'X' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');

    const missing = await request(app)
      .patch('/api/admin/districts/no-such-id')
      .set('Cookie', auth)
      .send({ name: 'Fine' });
    expect(missing.status).toBe(404);

    // The failed writes changed nothing.
    expect((await districtRepository.get(district._id)).name).toBe('Pune District');
  });

  it('walks publish → unpublish → archive and hides the district each time', async () => {
    const district = await districtRepository.create({ name: 'Lonavala', slug: 'lonavala', status: 'DRAFT' });
    const auth = await adminSession();
    const url = `/api/admin/districts/${district._id}`;

    expect((await request(app).get('/api/districts/lonavala')).status).toBe(404);

    const published = await request(app).post(`${url}/publish`).set('Cookie', auth);
    expect(published.status).toBe(200);
    expect(published.body.data.district.status).toBe('PUBLISHED');
    expect(published.body.data.district.publishedAt).toBeTruthy();
    expect((await request(app).get('/api/districts/lonavala')).status).toBe(200);

    const unpublished = await request(app).post(`${url}/unpublish`).set('Cookie', auth);
    expect(unpublished.status).toBe(200);
    expect(unpublished.body.data.district.status).toBe('DRAFT');
    expect((await request(app).get('/api/districts/lonavala')).status).toBe(404);

    const archived = await request(app).post(`${url}/archive`).set('Cookie', auth);
    expect(archived.status).toBe(200);
    expect(archived.body.data.district.status).toBe('ARCHIVED');
    expect((await request(app).get('/api/districts/lonavala')).status).toBe(404);

    // ADMIN sees the archived row; the public never does.
    const adminRes = await request(app).get(`/api/admin/districts/${district._id}`).set('Cookie', auth);
    expect(adminRes.body.data.district.status).toBe('ARCHIVED');
  });

  it('audits every lifecycle transition', async () => {
    const district = await districtRepository.create({ name: 'Lonavala', slug: 'lonavala', status: 'DRAFT' });
    const auth = await adminSession();
    const url = `/api/admin/districts/${district._id}`;

    await request(app).post(`${url}/publish`).set('Cookie', auth);
    await request(app).post(`${url}/archive`).set('Cookie', auth);

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'DISTRICT_PUBLISHED')).toBe(true);
    expect(actions.some((a) => a.action === 'DISTRICT_ARCHIVED')).toBe(true);

    const published = actions.find((a) => a.action === 'DISTRICT_PUBLISHED');
    expect(published.entityId).toBe(district._id);
    expect(published.actorRole).toBe(ROLES.CONTENT);
    expect(published.actorId).toBeTruthy();
  });

  it('returns 404 when a lifecycle transition targets an unknown id', async () => {
    const auth = await adminSession();
    for (const action of ['publish', 'unpublish', 'archive']) {
      const res = await request(app).post(`/api/admin/districts/no-such-id/${action}`).set('Cookie', auth);
      expect(res.status).toBe(404);
    }
  });

  it('does NOT release the slug claim on archive', async () => {
    const auth = await adminSession();
    const created = await request(app)
      .post('/api/admin/districts')
      .set('Cookie', auth)
      .send({ name: 'Lonavala', slug: 'lonavala' });
    const id = created.body.data.district.id;

    await request(app).post(`/api/admin/districts/${id}/archive`).set('Cookie', auth);

    // The entity still exists, so the slug is still taken.
    expect(await resolveSlug('lonavala')).toMatchObject({ entityId: id, collection: 'districts' });

    const again = await request(app)
      .post('/api/admin/districts')
      .set('Cookie', auth)
      .send({ name: 'Impostor', slug: 'lonavala' });
    expect(again.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

describe('Category', () => {
  it('lists published categories ordered by sortOrder', async () => {
    await categoryRepository.create({ name: 'Heritage', slug: 'heritage', status: 'PUBLISHED', sortOrder: 2 });
    await categoryRepository.create({ name: 'Wildlife', slug: 'wildlife', status: 'PUBLISHED', sortOrder: 1 });
    await categoryRepository.create({ name: 'Draft', slug: 'draft-cat', status: 'DRAFT' });

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((c) => c.slug)).toEqual(['wildlife', 'heritage']);
    expect(res.body.data.items[0]).toEqual({
      id: expect.any(String),
      slug: 'wildlife',
      name: 'Wildlife',
      sortOrder: 1,
    });
  });

  it('reads a published category by slug and 404s a DRAFT one', async () => {
    await categoryRepository.create({ name: 'Wildlife', slug: 'wildlife', status: 'PUBLISHED' });
    await categoryRepository.create({ name: 'Hidden', slug: 'hidden-cat', status: 'DRAFT' });

    const published = await request(app).get('/api/categories/wildlife');
    expect(published.status).toBe(200);
    expect(published.body.data.category.name).toBe('Wildlife');

    const draft = await request(app).get('/api/categories/hidden-cat');
    expect(draft.status).toBe(404);
    expect(draft.body.message).toBe((await request(app).get('/api/categories/nope')).body.message);
  });

  it('PATCHes sortOrder and name, then publishes', async () => {
    const category = await categoryRepository.create({
      name: 'Wildlife',
      slug: 'wildlife',
      status: 'DRAFT',
    });
    const auth = await adminSession();

    const patched = await request(app)
      .patch(`/api/admin/categories/${category._id}`)
      .set('Cookie', auth)
      .send({ name: 'Wildlife & Nature', sortOrder: 7 });

    expect(patched.status).toBe(200);
    expect(patched.body.data.category.name).toBe('Wildlife & Nature');
    expect(patched.body.data.category.sortOrder).toBe(7);

    const published = await request(app)
      .post(`/api/admin/categories/${category._id}/publish`)
      .set('Cookie', auth);
    expect(published.status).toBe(200);
    expect((await request(app).get('/api/categories/wildlife')).status).toBe(200);

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'CATEGORY_UPDATED')).toBe(true);
    expect(actions.some((a) => a.action === 'CATEGORY_PUBLISHED')).toBe(true);
  });

  it('returns 400 on an invalid PATCH and 404 on an unknown id', async () => {
    const category = await categoryRepository.create({ name: 'Wildlife', slug: 'wildlife' });
    const auth = await adminSession();

    expect(
      (await request(app).patch(`/api/admin/categories/${category._id}`).set('Cookie', auth).send({ name: 'W' })).status
    ).toBe(400);
    expect(
      (await request(app).patch('/api/admin/categories/nope').set('Cookie', auth).send({ name: 'Fine' })).status
    ).toBe(404);
  });

  it('archives a category and removes it from the public list', async () => {
    const category = await categoryRepository.create({ name: 'Wildlife', slug: 'wildlife', status: 'PUBLISHED' });
    const auth = await adminSession();

    expect((await request(app).get('/api/categories')).body.data.items).toHaveLength(1);

    const archived = await request(app)
      .post(`/api/admin/categories/${category._id}/archive`)
      .set('Cookie', auth);
    expect(archived.status).toBe(200);

    expect((await request(app).get('/api/categories')).body.data.items).toHaveLength(0);
    expect((await request(app).get('/api/categories/wildlife')).status).toBe(404);
    expect(await resolveSlug('wildlife')).toMatchObject({ entityId: category._id });
  });
});

// ---------------------------------------------------------------------------
// Place
// ---------------------------------------------------------------------------

describe('Place', () => {
  it('lists, reads by slug and resolves its district and categories', async () => {
    const district = await seedDistrict();
    const category = await categoryRepository.create({
      name: 'Heritage',
      slug: 'heritage',
      status: 'PUBLISHED',
    });
    const place = await placeRepository.create({
      ...placeBody(district._id),
      categoryIds: [category._id],
      status: 'PUBLISHED',
    });

    const list = await request(app).get('/api/places');
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].districtId).toBe(district._id);

    const detail = await request(app).get('/api/places/lohagad-fort');
    expect(detail.status).toBe(200);
    expect(detail.body.data.place.district).toEqual({
      id: district._id,
      slug: 'pune-district',
      name: 'Pune District',
    });
    expect(detail.body.data.place.categories).toEqual([
      { id: category._id, slug: 'heritage', name: 'Heritage' },
    ]);
    expect(place._id).toBeTruthy();
  });

  it('404s a DRAFT place and an unknown slug identically', async () => {
    const district = await seedDistrict();
    await placeRepository.create({ ...placeBody(district._id), status: 'DRAFT' });

    const draft = await request(app).get('/api/places/lohagad-fort');
    const unknown = await request(app).get('/api/places/never-existed');

    expect(draft.status).toBe(404);
    expect(draft.body.message).toBe(unknown.body.message);
  });

  it('rejects an unknown districtId with 400 and a documented details[]', async () => {
    const auth = await adminSession();

    const res = await request(app)
      .post('/api/admin/places')
      .set('Cookie', auth)
      .send(placeBody('no-such-district'));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/district does not exist/i);
    expect(res.body.details).toEqual([{ field: 'districtId', message: 'Unknown district' }]);

    // Nothing was written and no slug was burned.
    expect((await getFirestore().collection('places').get()).size).toBe(0);
    expect(await resolveSlug('lohagad-fort')).toBeNull();
  });

  it('rejects a PATCH that moves a place to an unknown district', async () => {
    const district = await seedDistrict();
    const place = await placeRepository.create(placeBody(district._id));
    const auth = await adminSession();

    const res = await request(app)
      .patch(`/api/admin/places/${place._id}`)
      .set('Cookie', auth)
      .send({ districtId: 'no-such-district' });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ field: 'districtId', message: 'Unknown district' }]);
    expect((await placeRepository.get(place._id)).districtId).toBe(district._id);
  });

  it('filters the public place list by district and category', async () => {
    const pune = await seedDistrict();
    const nashik = await seedDistrict({ name: 'Nashik District', slug: 'nashik-district' });
    const heritage = await categoryRepository.create({ name: 'Heritage', slug: 'heritage', status: 'PUBLISHED' });

    await placeRepository.create({
      ...placeBody(pune._id, { name: 'Lohagad Fort', slug: 'lohagad-fort' }),
      categoryIds: [heritage._id],
      status: 'PUBLISHED',
    });
    await placeRepository.create({
      ...placeBody(nashik._id, { name: 'Pandavleni', slug: 'pandavleni-caves', description: 'Rock-cut caves near Nashik city.' }),
      status: 'PUBLISHED',
    });

    const all = await request(app).get('/api/places');
    expect(all.body.data.items).toHaveLength(2);

    const byDistrict = await request(app).get('/api/places?district=pune-district');
    expect(byDistrict.body.data.items.map((p) => p.slug)).toEqual(['lohagad-fort']);

    const byCategory = await request(app).get('/api/places?category=heritage');
    expect(byCategory.body.data.items.map((p) => p.slug)).toEqual(['lohagad-fort']);

    // An unresolvable filter is an empty set, never unfiltered data.
    const unknownDistrict = await request(app).get('/api/places?district=nowhere');
    expect(unknownDistrict.status).toBe(200);
    expect(unknownDistrict.body.data.items).toEqual([]);
  });

  it('walks publish → unpublish → archive and audits the transitions', async () => {
    const district = await seedDistrict();
    const place = await placeRepository.create(placeBody(district._id));
    const auth = await adminSession();
    const url = `/api/admin/places/${place._id}`;

    const published = await request(app).post(`${url}/publish`).set('Cookie', auth);
    expect(published.status).toBe(200);
    expect(published.body.data.place.status).toBe('PUBLISHED');
    expect((await request(app).get('/api/places/lohagad-fort')).status).toBe(200);

    const unpublished = await request(app).post(`${url}/unpublish`).set('Cookie', auth);
    expect(unpublished.body.data.place.status).toBe('DRAFT');
    expect((await request(app).get('/api/places/lohagad-fort')).status).toBe(404);

    const archived = await request(app).post(`${url}/archive`).set('Cookie', auth);
    expect(archived.body.data.place.status).toBe('ARCHIVED');

    // The admin list still holds the archived row; the public never sees it.
    const adminList = await request(app).get('/api/admin/places').set('Cookie', auth);
    expect(adminList.body.data.items).toHaveLength(1);
    expect(adminList.body.data.items[0].status).toBe('ARCHIVED');
    expect((await request(app).get('/api/places')).body.data.items).toHaveLength(0);

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'PLACE_PUBLISHED')).toBe(true);
    expect(actions.some((a) => a.action === 'PLACE_ARCHIVED')).toBe(true);

    // Archival is not deletion: the slug claim survives.
    expect(await resolveSlug('lohagad-fort')).toMatchObject({ entityId: place._id });
  });

  it('returns 404 for a lifecycle transition on an unknown place', async () => {
    const auth = await adminSession();
    for (const action of ['publish', 'unpublish', 'archive']) {
      const res = await request(app).post(`/api/admin/places/no-such-id/${action}`).set('Cookie', auth);
      expect(res.status).toBe(404);
    }
  });
});

// ---------------------------------------------------------------------------
// Authorization matrix (§60 — server-side, never UI-only)
// ---------------------------------------------------------------------------

describe('taxonomy authorization matrix', () => {
  /** Creates one PUBLISHED item per entity so the routes have real targets. */
  async function seedAll() {
    const district = await seedDistrict();
    const category = await categoryRepository.create({ name: 'Heritage', slug: 'heritage', status: 'PUBLISHED' });
    const place = await placeRepository.create({
      ...placeBody(district._id),
      status: 'PUBLISHED',
    });
    return { district, category, place };
  }

  it.each([
    ['districts', 'District'],
    ['categories', 'Category'],
    ['places', 'Place'],
  ])('returns 401 unauthenticated on every /api/admin/%s route', async (entity) => {
    const { district, category, place } = await seedAll();
    const id = { districts: district._id, categories: category._id, places: place._id }[entity];

    expect((await request(app).get(`/api/admin/${entity}`)).status).toBe(401);
    expect((await request(app).get(`/api/admin/${entity}/${id}`)).status).toBe(401);
    expect((await request(app).post(`/api/admin/${entity}`).send({})).status).toBe(401);
    expect((await request(app).patch(`/api/admin/${entity}/${id}`).send({ name: 'X' })).status).toBe(401);
    expect((await request(app).post(`/api/admin/${entity}/${id}/publish`)).status).toBe(401);
    expect((await request(app).post(`/api/admin/${entity}/${id}/unpublish`)).status).toBe(401);
    expect((await request(app).post(`/api/admin/${entity}/${id}/archive`)).status).toBe(401);
  });

  it.each([
    ['districts', 'District'],
    ['categories', 'Category'],
    ['places', 'Place'],
  ])('returns 403 for an authenticated CUSTOMER on /api/admin/%s', async (entity) => {
    const { district, category, place } = await seedAll();
    const auth = await customerSession();
    const id = { districts: district._id, categories: category._id, places: place._id }[entity];

    const list = await request(app).get(`/api/admin/${entity}`).set('Cookie', auth);
    expect(list.status).toBe(403);
    expect(list.body.code).toBe('FORBIDDEN_ROLE');

    expect((await request(app).get(`/api/admin/${entity}/${id}`).set('Cookie', auth)).status).toBe(403);
    expect((await request(app).post(`/api/admin/${entity}`).set('Cookie', auth).send({})).status).toBe(403);
    expect(
      (await request(app).patch(`/api/admin/${entity}/${id}`).set('Cookie', auth).send({ name: 'X' })).status
    ).toBe(403);
    expect((await request(app).post(`/api/admin/${entity}/${id}/archive`).set('Cookie', auth)).status).toBe(403);
  });

  it.each([
    ['districts', 'District'],
    ['categories', 'Category'],
    ['places', 'Place'],
  ])('returns 200 for CONTENT on every /api/admin/%s read', async (entity) => {
    const { district, category, place } = await seedAll();
    const auth = await adminSession();
    const id = { districts: district._id, categories: category._id, places: place._id }[entity];

    const list = await request(app).get(`/api/admin/${entity}`).set('Cookie', auth);
    const read = await request(app).get(`/api/admin/${entity}/${id}`).set('Cookie', auth);

    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(read.status).toBe(200);
  });

  it('lets a CONTENT user create every taxonomy entity (200/201 path is real)', async () => {
    const auth = await adminSession();

    const district = await request(app)
      .post('/api/admin/districts')
      .set('Cookie', auth)
      .send({ name: 'Nashik District', slug: 'nashik-district' });
    expect(district.status).toBe(201);

    const category = await request(app)
      .post('/api/admin/categories')
      .set('Cookie', auth)
      .send({ name: 'Heritage', slug: 'heritage' });
    expect(category.status).toBe(201);

    const place = await request(app)
      .post('/api/admin/places')
      .set('Cookie', auth)
      .send(placeBody(district.body.data.district.id));
    expect(place.status).toBe(201);

    const actions = await auditActions();
    expect(actions.some((a) => a.action === 'DISTRICT_CREATED')).toBe(true);
    expect(actions.some((a) => a.action === 'CATEGORY_CREATED')).toBe(true);
    expect(actions.some((a) => a.action === 'PLACE_CREATED')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// District pagination (public surface)
// ---------------------------------------------------------------------------

describe('GET /api/districts — pagination', () => {
  it('returns no cursor when the page is exactly full', async () => {
    await seedOrderedDistricts(3);

    const res = await request(app).get('/api/districts?limit=3');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('returns a cursor when one more district exists beyond the page', async () => {
    await seedOrderedDistricts(4);

    const res = await request(app).get('/api/districts?limit=3');

    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.nextCursor).toBeTruthy();
  });

  it('continues on page 2 with no duplicates and no gaps', async () => {
    await seedOrderedDistricts(5);

    const pageOne = await request(app).get('/api/districts?limit=2');
    expect(pageOne.body.data.items.map((d) => d.name)).toEqual(['District 4', 'District 3']);
    expect(pageOne.body.data.nextCursor).toBeTruthy();

    const pageTwo = await request(app).get(
      `/api/districts?limit=2&cursor=${encodeURIComponent(pageOne.body.data.nextCursor)}`
    );
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.items.map((d) => d.name)).toEqual(['District 2', 'District 1']);
    expect(pageTwo.body.data.nextCursor).toBeTruthy();

    const pageThree = await request(app).get(
      `/api/districts?limit=2&cursor=${encodeURIComponent(pageTwo.body.data.nextCursor)}`
    );
    expect(pageThree.body.data.items.map((d) => d.name)).toEqual(['District 0']);
    expect(pageThree.body.data.nextCursor).toBeNull();

    const seen = [
      ...pageOne.body.data.items,
      ...pageTwo.body.data.items,
      ...pageThree.body.data.items,
    ].map((d) => d.slug);
    expect(seen).toEqual(['district-4', 'district-3', 'district-2', 'district-1', 'district-0']);
    expect(new Set(seen).size).toBe(5);
  });

  it('never leaks DRAFT districts into a cursor page', async () => {
    // DRAFT rows are interleaved in time with the PUBLISHED ones, so a
    // dropped `status` filter on the cursor page would surface them here.
    await seedOrderedDistricts(2, { status: 'DRAFT', prefix: 'draft' });
    await seedOrderedDistricts(2, { status: 'PUBLISHED', prefix: 'live' });

    const pageOne = await request(app).get('/api/districts?limit=2');
    expect(pageOne.body.data.items).toHaveLength(2);
    expect(pageOne.body.data.items.every((d) => d.status === 'PUBLISHED')).toBe(true);

    const pageTwo = await request(app).get(
      `/api/districts?limit=2&cursor=${encodeURIComponent(pageOne.body.data.nextCursor)}`
    );
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.items).toHaveLength(2);
    expect(pageTwo.body.data.items.every((d) => d.status === 'PUBLISHED')).toBe(true);
    expect(pageTwo.body.data.nextCursor).toBeNull();
  });

  it('clamps an oversized limit to the hard ceiling', async () => {
    await seedOrderedDistricts(2);

    const res = await request(app).get('/api/districts?limit=100000');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('paginates the admin list too, and still shows DRAFT content', async () => {
    await seedOrderedDistricts(3, { status: 'DRAFT' });
    const auth = await adminSession();

    const res = await request(app).get('/api/admin/districts?limit=2').set('Cookie', auth);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.nextCursor).toBeTruthy();

    const pageTwo = await request(app).get(
      `/api/admin/districts?limit=2&cursor=${encodeURIComponent(res.body.data.nextCursor)}`
    ).set('Cookie', auth);
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.items).toHaveLength(1);
    expect(pageTwo.body.data.nextCursor).toBeNull();
  });
});
