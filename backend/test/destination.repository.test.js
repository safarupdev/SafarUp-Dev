/**
 * Destination repository tests — PRD §22, FIRESTORE.destination.contract.md.
 *
 * Covers the data-access guarantees the contract makes and that the rest of
 * the stack depends on:
 *
 *   - the slug is claimed in the SAME transaction as the write (§3)
 *   - only PUBLISHED content is publicly readable (§2.2)
 *   - Firestore `Timestamp` values are normalised to `Date` at the boundary
 *   - relations resolve without N+1 reads (§5)
 *   - list queries are bounded and cursor-paginated (§4)
 *   - every consequential mutation writes an audit entry (§77)
 *
 * ESM test file + `createRequire`, because the backend is CommonJS.
 */

import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const { requireEmulator, clearCollection, teardown } = require('./helpers/emulator.js');
const { instrumentReads } = require('./helpers/instrumentReads.js');
const { getFirestore } = require('../src/config/database.js');
const destinationRepository = require('../src/repositories/destination.repository.js');
const districtRepository = require('../src/repositories/district.repository.js');
const categoryRepository = require('../src/repositories/category.repository.js');
const placeRepository = require('../src/repositories/place.repository.js');
const { resolveSlug } = require('../src/repositories/slugClaim.repository.js');
const contentRepository = require('../src/repositories/content.repository.js');

const { COLLECTION: DESTINATIONS } = destinationRepository;
const COLLECTIONS = ['destinations', 'districts', 'categories', 'places', 'slugClaims', 'auditLogs'];

/** A valid destination body; every test overrides only what it cares about. */
function destinationFields(overrides = {}) {
  return {
    name: 'Lonavala',
    slug: 'lonavala',
    districtId: null,
    categoryIds: [],
    placeIds: [],
    shortDescription: 'A hill station in the Sahyadri range.',
    description: 'A popular weekend hill station just beyond the Western Ghats.',
    heroImage: 'https://example.com/lonavala-hero.jpg',
    seoTitle: 'Lonavala — Hill Station',
    metaDescription: 'Plan a weekend trip to Lonavala with SafarUp.',
    canonicalUrl: 'https://safarup.in/destinations/lonavala',
    ...overrides,
  };
}

/** Seeds one district plus the requested number of categories and places. */
async function seedTaxonomy({ categoryCount = 1, placeCount = 1, prefix = '' } = {}) {
  const district = await districtRepository.create({
    name: `${prefix || 'Pune'} District`,
    slug: `${prefix ? `${prefix}-` : ''}pune-district`,
    status: 'PUBLISHED',
  });

  const categories = [];
  for (let i = 0; i < categoryCount; i += 1) {
    categories.push(
      await categoryRepository.create({
        name: `Category ${i}`,
        slug: `${prefix ? `${prefix}-` : ''}category-${i}`,
        status: 'PUBLISHED',
        sortOrder: i,
      })
    );
  }

  const places = [];
  for (let i = 0; i < placeCount; i += 1) {
    places.push(
      await placeRepository.create({
        name: `Place ${i}`,
        slug: `${prefix ? `${prefix}-` : ''}place-${i}`,
        districtId: district._id,
        description: 'A canonical place used by the repository tests.',
        status: 'PUBLISHED',
      })
    );
  }

  return { district, categories, places };
}

async function auditEntries() {
  const snapshot = await getFirestore().collection('auditLogs').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** Forces a known `updatedAt` so ordering/pagination is deterministic. */
async function setUpdatedAt(id, date, collection = DESTINATIONS) {
  await getFirestore().collection(collection).doc(id).update({ updatedAt: date });
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
});

describe('destinationRepository.create()', () => {
  it('creates the entity and claims its slug in one transaction', async () => {
    const { district } = await seedTaxonomy();

    const created = await destinationRepository.create(
      destinationFields({ districtId: district._id })
    );

    expect(created._id).toBeTruthy();
    expect(created.status).toBe('DRAFT');
    expect(created.featured).toBe(false);
    expect(created.createdAt).toBeInstanceOf(Date);

    // The claim exists and points at the entity just written.
    expect(await resolveSlug('lonavala')).toEqual({
      entityId: created._id,
      collection: 'destinations',
    });

    const stored = await destinationRepository.get(created._id);
    expect(stored.slug).toBe('lonavala');
    expect(stored.districtId).toBe(district._id);
  });

  it('rejects a duplicate slug and leaves the original untouched', async () => {
    const { district } = await seedTaxonomy();
    const original = await destinationRepository.create(
      destinationFields({ districtId: district._id })
    );

    await expect(
      destinationRepository.create(
        destinationFields({ name: 'Impostor', districtId: district._id })
      )
    ).rejects.toMatchObject({ code: 11000 });

    const stored = await destinationRepository.get(original._id);
    expect(stored.name).toBe('Lonavala');
    expect(await resolveSlug('lonavala')).toEqual({
      entityId: original._id,
      collection: 'destinations',
    });
  });

  it('stores relations as IDs, never as copies', async () => {
    const { district, categories, places } = await seedTaxonomy({ categoryCount: 2, placeCount: 2 });

    const created = await destinationRepository.create(
      destinationFields({
        districtId: district._id,
        categoryIds: categories.map((c) => c._id),
        placeIds: places.map((p) => p._id),
      })
    );

    const stored = await destinationRepository.get(created._id);
    expect(stored.districtId).toBe(district._id);
    expect(stored.categoryIds).toEqual(categories.map((c) => c._id));
    expect(stored.placeIds).toEqual(places.map((p) => p._id));
    // No denormalised name/document is smuggled in alongside the references.
    expect(stored.district).toBeUndefined();
    expect(stored.places).toBeUndefined();
  });
});

describe('destinationRepository.findPublished()', () => {
  it('returns null for a DRAFT destination', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(
      destinationFields({ districtId: district._id, status: 'DRAFT' })
    );

    expect(created.status).toBe('DRAFT');
    expect(await destinationRepository.findPublished('lonavala')).toBeNull();
  });

  it('returns null for an unknown slug', async () => {
    expect(await destinationRepository.findPublished('nothing-here')).toBeNull();
  });

  it('returns null when the slug belongs to a different entity type', async () => {
    await seedTaxonomy();
    await districtRepository.create({ name: 'Other', slug: 'other-district' });

    // The claim exists, but for `districts` — not a destination.
    expect(await destinationRepository.findPublished('other-district')).toBeNull();
  });

  it('returns the entity once it is PUBLISHED', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(destinationFields({ districtId: district._id }));

    const published = await destinationRepository.setStatus(created._id, 'PUBLISHED', {
      actorId: 'actor-1',
      actorRole: 'CONTENT',
    });
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeInstanceOf(Date);

    const found = await destinationRepository.findPublished('lonavala');
    expect(found._id).toBe(created._id);
    expect(found.name).toBe('Lonavala');
  });

  it('findOneBySlug() resolves regardless of status (admin use)', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(destinationFields({ districtId: district._id }));

    const found = await destinationRepository.findOneBySlug('lonavala');
    expect(found._id).toBe(created._id);
    expect(found.status).toBe('DRAFT');
  });
});

describe('date normalisation', () => {
  it('returns Date instances, never Firestore Timestamps', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(destinationFields({ districtId: district._id }));

    const stored = await destinationRepository.get(created._id);

    for (const field of ['createdAt', 'updatedAt']) {
      expect(stored[field]).toBeInstanceOf(Date);
      expect(typeof stored[field].getTime()).toBe('number');
      // A raw Timestamp would serialise as { _seconds, _nanoseconds }.
      expect(stored[field]._seconds).toBeUndefined();
      expect(stored[field]._nanoseconds).toBeUndefined();
    }
  });

  it('serialises dates as ISO 8601 rather than a Timestamp object', async () => {
    const { district } = await seedTaxonomy();
    await destinationRepository.create(destinationFields({ districtId: district._id }));

    const raw = await getFirestore()
      .collection(DESTINATIONS)
      .limit(1)
      .get();
    const viaRepository = destinationRepository.toEntity(raw.docs[0]);

    const serialised = JSON.parse(JSON.stringify({ createdAt: viaRepository.createdAt }));
    expect(serialised.createdAt).toBe(viaRepository.createdAt.toISOString());
  });

  it('normalises publishedAt after a publish', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(destinationFields({ districtId: district._id }));

    const published = await destinationRepository.setStatus(created._id, 'PUBLISHED', {
      actorId: 'actor-1',
      actorRole: 'CONTENT',
    });

    expect(published.publishedAt).toBeInstanceOf(Date);
    expect(published.publishedAt._seconds).toBeUndefined();
  });
});

describe('destinationRepository.resolveRelations()', () => {
  it('resolves district, categories and places', async () => {
    const { district, categories, places } = await seedTaxonomy({ categoryCount: 2, placeCount: 2 });

    const created = await destinationRepository.create(
      destinationFields({
        districtId: district._id,
        categoryIds: categories.map((c) => c._id),
        placeIds: places.map((p) => p._id),
      })
    );

    const document = await destinationRepository.get(created._id);
    const relations = await destinationRepository.resolveRelations(document);

    expect(relations.district).toEqual({
      id: district._id,
      slug: 'pune-district',
      name: 'Pune District',
    });
    expect(relations.categories).toEqual(
      categories.map((c) => ({ id: c._id, slug: c.slug, name: c.name }))
    );
    expect(relations.places).toEqual(places.map((p) => ({ id: p._id, slug: p.slug, name: p.name })));
  });

  it('preserves the stored reference order', async () => {
    const { district, categories } = await seedTaxonomy({ categoryCount: 3 });
    const reversed = [...categories].reverse().map((c) => c._id);

    const created = await destinationRepository.create(
      destinationFields({ districtId: district._id, categoryIds: reversed })
    );

    const relations = await destinationRepository.resolveRelations(await destinationRepository.get(created._id));
    expect(relations.categories.map((c) => c.id)).toEqual(reversed);
  });

  it('returns null for a null destination', async () => {
    expect(await destinationRepository.resolveRelations(null)).toBeNull();
  });

  it('degrades safely when references dangle', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(
      destinationFields({ districtId: district._id, categoryIds: ['ghost-category'], placeIds: ['ghost-place'] })
    );

    const relations = await destinationRepository.resolveRelations(await destinationRepository.get(created._id));

    expect(relations.district).toMatchObject({ id: district._id });
    expect(relations.categories).toEqual([]);
    expect(relations.places).toEqual([]);
  });

  /**
   * No N+1 (FIRESTORE.destination.contract.md §5).
   *
   * The read count must be identical for a destination with one reference
   * and for one with many — that is only true if the references are batched
   * into one read per collection rather than read one at a time.
   */
  it('issues a bounded number of reads regardless of reference count', async () => {
    const small = await seedTaxonomy({ categoryCount: 1, placeCount: 1, prefix: 'small' });
    const smallDestination = await destinationRepository.create(
      destinationFields({
        slug: 'small',
        districtId: small.district._id,
        categoryIds: small.categories.map((c) => c._id),
        placeIds: small.places.map((p) => p._id),
      })
    );

    const large = await seedTaxonomy({ categoryCount: 6, placeCount: 6, prefix: 'large' });
    const largeDestination = await destinationRepository.create(
      destinationFields({
        slug: 'large',
        districtId: large.district._id,
        categoryIds: large.categories.map((c) => c._id),
        placeIds: large.places.map((p) => p._id),
      })
    );

    // Read the raw documents first: the probe must measure ONLY the
    // relation resolution, not the lookup that produced the input.
    const smallDocument = await destinationRepository.get(smallDestination._id);
    const largeDocument = await destinationRepository.get(largeDestination._id);

    const probe = instrumentReads();
    try {
      await destinationRepository.resolveRelations(smallDocument);
      const smallReads = probe.reads();
      const smallCollections = probe.collectionsRead();

      const largeRelations = await destinationRepository.resolveRelations(largeDocument);

      // Same number of reads for 12 references as for 3.
      expect(largeRelations.categories).toHaveLength(6);
      expect(largeRelations.places).toHaveLength(6);
      expect(probe.reads() - smallReads).toBe(smallReads);

      // One read per referenced collection — never one read per ID.
      expect(smallReads).toBe(3);
      expect(smallCollections).toEqual(['categories', 'districts', 'places']);
    } finally {
      probe.restore();
    }
  });
});

describe('destinationRepository.list()', () => {
  /** Creates N published destinations with strictly increasing updatedAt. */
  async function seedPublished(count, { status = 'PUBLISHED' } = {}) {
    const { district } = await seedTaxonomy();
    const base = new Date('2026-01-01T00:00:00.000Z').getTime();

    const created = [];
    for (let i = 0; i < count; i += 1) {
      const item = await destinationRepository.create(
        destinationFields({ name: `Destination ${i}`, slug: `destination-${i}`, districtId: district._id, status })
      );
      await setUpdatedAt(item._id, new Date(base + i * 1000));
      created.push(item);
    }
    return { district, created };
  }

  it('returns a bounded page, newest first', async () => {
    await seedPublished(5);

    const result = await destinationRepository.list({ status: 'PUBLISHED', limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.items.map((d) => d.name)).toEqual(['Destination 4', 'Destination 3', 'Destination 2']);
  });

  it('clamps an oversized limit to the hard ceiling', async () => {
    await seedPublished(3);

    const result = await destinationRepository.list({ status: 'PUBLISHED', limit: 100000 });
    // MAX_LIMIT is 100 and there are only 3 documents, so the query is
    // bounded regardless of what the caller asked for.
    expect(result.items).toHaveLength(3);
  });

  it('returns no cursor when the page is not full', async () => {
    await seedPublished(3);

    const result = await destinationRepository.list({ status: 'PUBLISHED', limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('returns a cursor only when more pages exist, and walks them without overlap', async () => {
    await seedPublished(3);

    const pageOne = await destinationRepository.list({ status: 'PUBLISHED', limit: 2 });
    expect(pageOne.items.map((d) => d.name)).toEqual(['Destination 2', 'Destination 1']);
    expect(pageOne.nextCursor).toBeTruthy();

    const pageTwo = await destinationRepository.list({
      status: 'PUBLISHED',
      limit: 2,
      cursor: pageOne.nextCursor,
    });
    expect(pageTwo.items.map((d) => d.name)).toEqual(['Destination 0']);
    // The last page is not full, so there is nothing after it.
    expect(pageTwo.nextCursor).toBeNull();

    const seen = [...pageOne.items, ...pageTwo.items].map((d) => d.name);
    expect(seen).toEqual(['Destination 2', 'Destination 1', 'Destination 0']);
    expect(new Set(seen).size).toBe(3);
  });

  it('ignores a malformed cursor rather than throwing', async () => {
    await seedPublished(2);

    const result = await destinationRepository.list({
      status: 'PUBLISHED',
      limit: 2,
      cursor: 'not-a-real-cursor',
    });
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('filters by status', async () => {
    const { district } = await seedTaxonomy();
    await destinationRepository.create(
      destinationFields({ name: 'Draft One', slug: 'draft-one', districtId: district._id, status: 'DRAFT' })
    );
    await destinationRepository.create(
      destinationFields({ name: 'Live One', slug: 'live-one', districtId: district._id, status: 'PUBLISHED' })
    );

    const published = await destinationRepository.list({ status: 'PUBLISHED' });
    expect(published.items.map((d) => d.name)).toEqual(['Live One']);

    const drafts = await destinationRepository.list({ status: 'DRAFT' });
    expect(drafts.items.map((d) => d.name)).toEqual(['Draft One']);
  });

  it('filters by featured flag', async () => {
    const { district } = await seedTaxonomy();
    const plain = await destinationRepository.create(
      destinationFields({ name: 'Plain', slug: 'plain', districtId: district._id, status: 'PUBLISHED' })
    );
    await destinationRepository.create(
      destinationFields({ name: 'Hero', slug: 'hero', districtId: district._id, status: 'PUBLISHED', featured: true })
    );

    const featured = await destinationRepository.list({ status: 'PUBLISHED', featured: true });
    expect(featured.items.map((d) => d.name)).toEqual(['Hero']);

    const notFeatured = await destinationRepository.list({ status: 'PUBLISHED', featured: false });
    expect(notFeatured.items.map((d) => d.name)).toEqual(['Plain']);
    expect(notFeatured.items[0]._id).toBe(plain._id);
  });

  it('filters by category membership', async () => {
    const { district, categories } = await seedTaxonomy({ categoryCount: 2 });
    await destinationRepository.create(
      destinationFields({
        name: 'Tagged',
        slug: 'tagged',
        districtId: district._id,
        categoryIds: [categories[1]._id],
        status: 'PUBLISHED',
      })
    );
    await destinationRepository.create(
      destinationFields({ name: 'Untagged', slug: 'untagged', districtId: district._id, status: 'PUBLISHED' })
    );

    const result = await destinationRepository.list({ status: 'PUBLISHED', categoryId: categories[1]._id });
    expect(result.items.map((d) => d.name)).toEqual(['Tagged']);
  });

  it('filters by districtId', async () => {
    const pune = await seedTaxonomy({ prefix: 'p' });
    const nashik = await seedTaxonomy({ prefix: 'n' });

    await destinationRepository.create(
      destinationFields({ name: 'In Pune', slug: 'in-pune', districtId: pune.district._id, status: 'PUBLISHED' })
    );
    await destinationRepository.create(
      destinationFields({ name: 'In Nashik', slug: 'in-nashik', districtId: nashik.district._id, status: 'PUBLISHED' })
    );

    const result = await destinationRepository.list({ status: 'PUBLISHED', districtId: pune.district._id });
    expect(result.items.map((d) => d.name)).toEqual(['In Pune']);
  });

  it('keeps the district filter on cursor pages', async () => {
    const pune = await seedTaxonomy({ prefix: 'p' });
    const nashik = await seedTaxonomy({ prefix: 'n' });
    const base = new Date('2026-02-01T00:00:00.000Z').getTime();

    // Three in Pune, one in Nashik — ordered so Nashik sits between two Pune
    // rows and would be skipped if the filter were dropped on page two.
    for (let i = 0; i < 3; i += 1) {
      const item = await destinationRepository.create(
        destinationFields({
          name: `Pune ${i}`,
          slug: `pune-${i}`,
          districtId: pune.district._id,
          status: 'PUBLISHED',
        })
      );
      await setUpdatedAt(item._id, new Date(base + i * 1000));
    }
    const outsider = await destinationRepository.create(
      destinationFields({ name: 'Nashik', slug: 'nashik', districtId: nashik.district._id, status: 'PUBLISHED' })
    );
    await setUpdatedAt(outsider._id, new Date(base + 1000));

    const pageOne = await destinationRepository.list({
      status: 'PUBLISHED',
      districtId: pune.district._id,
      limit: 2,
    });
    expect(pageOne.items.map((d) => d.name)).toEqual(['Pune 2', 'Pune 1']);
    expect(pageOne.nextCursor).toBeTruthy();

    const pageTwo = await destinationRepository.list({
      status: 'PUBLISHED',
      districtId: pune.district._id,
      limit: 2,
      cursor: pageOne.nextCursor,
    });
    expect(pageTwo.items.map((d) => d.name)).toEqual(['Pune 0']);
    expect(pageTwo.nextCursor).toBeNull();
  });
});

describe('destinationRepository.setFeatured()', () => {
  it('writes an audit log entry alongside the flag change', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(destinationFields({ districtId: district._id }));
    await destinationRepository.setStatus(created._id, 'PUBLISHED', {
      actorId: 'actor-1',
      actorRole: 'CONTENT',
    });

    const updated = await destinationRepository.setFeatured(created._id, true, {
      actorId: 'actor-1',
      actorRole: 'CONTENT',
    });

    expect(updated.featured).toBe(true);

    const entries = await auditEntries();
    const featured = entries.find((e) => e.action === 'DESTINATION_FEATURED');
    expect(featured).toBeTruthy();
    expect(featured.entityType).toBe('Destination');
    expect(featured.entityId).toBe(created._id);
    expect(featured.actorId).toBe('actor-1');
    expect(featured.actorRole).toBe('CONTENT');
    expect(featured.before).toEqual({ featured: false });
    expect(featured.after).toEqual({ featured: true });
  });

  it('records an UNFEATURED entry when the flag is cleared', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(
      destinationFields({ districtId: district._id, status: 'PUBLISHED', featured: true })
    );

    await destinationRepository.setFeatured(created._id, false, {
      actorId: 'actor-1',
      actorRole: 'CONTENT',
    });

    const entries = await auditEntries();
    expect(entries.some((e) => e.action === 'DESTINATION_UNFEATURED')).toBe(true);
    expect(entries.some((e) => e.action === 'DESTINATION_FEATURED')).toBe(false);
  });

  it('returns null for an unknown destination without writing an audit entry', async () => {
    const result = await destinationRepository.setFeatured('does-not-exist', true, {
      actorId: 'actor-1',
      actorRole: 'CONTENT',
    });

    expect(result).toBeNull();
    expect(await auditEntries()).toHaveLength(0);
  });
});

describe('destinationRepository.setStatus()', () => {
  it('records the lifecycle transition in the audit log', async () => {
    const { district } = await seedTaxonomy();
    const created = await destinationRepository.create(destinationFields({ districtId: district._id }));

    await destinationRepository.setStatus(created._id, 'PUBLISHED', {
      actorId: 'actor-1',
      actorRole: 'CONTENT',
    });

    const entries = await auditEntries();
    const published = entries.find((e) => e.action === 'DESTINATION_PUBLISHED');
    expect(published).toBeTruthy();
    expect(published.entityId).toBe(created._id);
  });
});

/**
 * Cursor helpers must have exactly ONE implementation.
 *
 * A second copy would drift: one repository's cursors would stop decoding in
 * another's `startAfter`, and the resulting pagination would silently skip
 * or repeat rows. Re-exporting the shared function is fine — identity is
 * what proves there is only one implementation.
 */
describe('cursor helpers have a single owner', () => {
  it('districtRepository re-exports the shared implementation, not a copy', () => {
    expect(typeof contentRepository.encodeCursor).toBe('function');
    expect(typeof contentRepository.decodeCursor).toBe('function');

    expect(districtRepository.encodeCursor).toBe(contentRepository.encodeCursor);
    expect(districtRepository.decodeCursor).toBe(contentRepository.decodeCursor);
  });

  it('round-trips a cursor and fails soft on a malformed one', () => {
    const at = new Date('2026-01-01T00:00:00.000Z');

    const encoded = contentRepository.encodeCursor(at, 'doc-42');
    expect(contentRepository.decodeCursor(encoded)).toEqual({
      updatedAt: at.getTime(),
      id: 'doc-42',
    });

    // A stale or hand-edited cursor must not take down a public list route.
    expect(contentRepository.decodeCursor('not-a-real-cursor')).toBeNull();
    expect(contentRepository.decodeCursor(undefined)).toBeNull();
  });
});

describe('districtRepository.list() — cursor pagination', () => {
  /** N districts with strictly increasing `updatedAt`, all PUBLISHED. */
  async function seedDistricts(count, { status = 'PUBLISHED' } = {}) {
    const base = new Date('2026-03-01T00:00:00.000Z').getTime();
    const created = [];

    for (let i = 0; i < count; i += 1) {
      const item = await districtRepository.create({
        name: `District ${i}`,
        slug: `district-${i}`,
        status,
      });
      await setUpdatedAt(item._id, new Date(base + i * 1000), 'districts');
      created.push(item);
    }
    return created;
  }

  /**
   * Regression: `hasMore = snapshot.size === max` cannot tell "the page is
   * exactly full" apart from "there are more rows behind it", so it hands
   * out a cursor that leads to an empty second page.
   */
  it('returns NO cursor when the page is exactly full', async () => {
    await seedDistricts(3);

    const result = await districtRepository.list({ status: 'PUBLISHED', limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('returns a cursor when one more record exists beyond the page', async () => {
    await seedDistricts(4);

    const result = await districtRepository.list({ status: 'PUBLISHED', limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeTruthy();
  });

  it('walks the cursor without throwing and without duplicating rows', async () => {
    await seedDistricts(5);

    const pageOne = await districtRepository.list({ status: 'PUBLISHED', limit: 2 });
    expect(pageOne.items.map((d) => d.name)).toEqual(['District 4', 'District 3']);

    // The cursor page must be a real, bounded query. A two-value `startAfter`
    // with a single `orderBy` (or an unbounded query) throws / over-reads.
    const pageTwo = await districtRepository.list({
      status: 'PUBLISHED',
      limit: 2,
      cursor: pageOne.nextCursor,
    });
    expect(pageTwo.items.map((d) => d.name)).toEqual(['District 2', 'District 1']);

    const pageThree = await districtRepository.list({
      status: 'PUBLISHED',
      limit: 2,
      cursor: pageTwo.nextCursor,
    });
    expect(pageThree.items.map((d) => d.name)).toEqual(['District 0']);
    expect(pageThree.nextCursor).toBeNull();

    const seen = [...pageOne.items, ...pageTwo.items, ...pageThree.items].map((d) => d.name);
    expect(seen).toEqual(['District 4', 'District 3', 'District 2', 'District 1', 'District 0']);
    expect(new Set(seen).size).toBe(5);
  });

  it('paginates when no status filter is supplied (admin list path)', async () => {
    await seedDistricts(4, { status: 'DRAFT' });

    // `where('status', '==', undefined)` is not a legal Firestore constraint,
    // so an unfiltered cursor page must never build one.
    const pageOne = await districtRepository.list({ limit: 3 });
    expect(pageOne.items).toHaveLength(3);
    expect(pageOne.nextCursor).toBeTruthy();

    const pageTwo = await districtRepository.list({ limit: 3, cursor: pageOne.nextCursor });
    expect(pageTwo.items).toHaveLength(1);
    expect(pageTwo.nextCursor).toBeNull();
  });

  it('ignores a malformed cursor instead of throwing or reordering', async () => {
    await seedDistricts(3);

    const result = await districtRepository.list({ status: 'PUBLISHED', limit: 3, cursor: 'garbage' });

    expect(result.items.map((d) => d.name)).toEqual(['District 2', 'District 1', 'District 0']);
    expect(result.nextCursor).toBeNull();
  });

  it('clamps an oversized limit to the hard ceiling', async () => {
    await seedDistricts(2);

    const result = await districtRepository.list({ status: 'PUBLISHED', limit: 100000 });
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });
});

describe('destinationRepository.list() — malformed cursor', () => {
  it('keeps the updatedAt ordering when the cursor cannot be decoded', async () => {
    const { district } = await seedTaxonomy();
    const base = new Date('2026-04-01T00:00:00.000Z').getTime();

    for (let i = 0; i < 3; i += 1) {
      const item = await destinationRepository.create(
        destinationFields({
          name: `Destination ${i}`,
          slug: `destination-${i}`,
          districtId: district._id,
          status: 'PUBLISHED',
        })
      );
      await setUpdatedAt(item._id, new Date(base + i * 1000));
    }

    // A cursor that decodes to null must not drop the ordering constraints:
    // an unordered query returns documents by document ID ascending, which
    // silently changes the result order the contract fixes.
    const result = await destinationRepository.list({
      status: 'PUBLISHED',
      limit: 3,
      cursor: 'garbage',
    });

    expect(result.items.map((d) => d.name)).toEqual(['Destination 2', 'Destination 1', 'Destination 0']);
    expect(result.nextCursor).toBeNull();
  });
});

