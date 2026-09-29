/**
 * Slug claim registry tests — PRD §51.3.
 *
 * The slug registry is the mechanism that makes a public `slug` unique
 * across every slugged entity. It exists because `User.create()` in Phase 0
 * had the exact bug it now prevents: a check-then-write outside a
 * transaction, where two concurrent writes both observed "free" and the
 * second silently clobbered the first.
 *
 * The concurrency test below is that same regression pattern applied to
 * slugs: two simultaneous `User.create()`-style writes for one slug must
 * yield exactly one winner, and the loser's payload must never overwrite
 * the winner's.
 *
 * Vitest 2 is ESM-only and the backend is CommonJS, so this file is ESM and
 * loads the application modules through `createRequire` (same pattern as
 * user.model.test.js / auth.test.js).
 */

import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const { requireEmulator, clearCollection, teardown } = require('./helpers/emulator.js');
const { getFirestore } = require('../src/config/database.js');
const { COLLECTION: CLAIM_COLLECTION, claimSlug, releaseSlug, resolveSlug } =
  require('../src/repositories/slugClaim.repository.js');
const { createWithSlug } = require('../src/repositories/content.repository.js');

/** Every collection these tests touch — cleared so suites cannot leak. */
const COLLECTIONS = [
  'destinations',
  'districts',
  'categories',
  'places',
  CLAIM_COLLECTION,
  'auditLogs',
];

/**
 * `User.create()`-style write: the entity document and its slug claim are
 * written in ONE transaction, so they can never disagree.
 */
function createSluggedEntity(collection, slug, document) {
  return createWithSlug({ collection, slug, document });
}

async function collectionDocs(name) {
  const snapshot = await getFirestore().collection(name).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

describe('claimSlug()', () => {
  it('stores a claim keyed by the normalized slug', async () => {
    const db = getFirestore();

    const claimed = await db.runTransaction((transaction) =>
      claimSlug(transaction, { slug: 'Lonavala', entityId: 'entity-1', collection: 'districts' })
    );

    expect(claimed).toBe('lonavala');

    const stored = await db.collection(CLAIM_COLLECTION).doc('lonavala').get();
    expect(stored.exists).toBe(true);
    expect(stored.data()).toMatchObject({
      entityId: 'entity-1',
      collection: 'districts',
      slug: 'lonavala',
    });
  });

  it('throws code 11000 when the slug is already claimed', async () => {
    const db = getFirestore();

    await db.runTransaction((transaction) =>
      claimSlug(transaction, { slug: 'pune', entityId: 'entity-1', collection: 'districts' })
    );

    await expect(
      db.runTransaction((transaction) =>
        claimSlug(transaction, { slug: 'pune', entityId: 'entity-2', collection: 'districts' })
      )
    ).rejects.toMatchObject({ code: 11000 });

    // The original claim is untouched — a rejected claim must not overwrite.
    expect(await resolveSlug('pune')).toEqual({ entityId: 'entity-1', collection: 'districts' });
  });

  it('normalizes case and surrounding whitespace to the same claim key', async () => {
    const db = getFirestore();

    await db.runTransaction((transaction) =>
      claimSlug(transaction, { slug: 'Kokan', entityId: 'entity-1', collection: 'districts' })
    );

    await expect(
      db.runTransaction((transaction) =>
        claimSlug(transaction, { slug: '  KOKAN  ', entityId: 'entity-2', collection: 'districts' })
      )
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe('concurrent slug claims', () => {
  /**
   * The Phase 0 regression pattern, applied to slugs.
   *
   * Both writers build their own document reference BEFORE the transaction
   * and then claim the same slug inside it. Because the claim document's ID
   * *is* the slug, the transaction engine serialises the two attempts on a
   * single point read: the loser sees the winner's claim and aborts before
   * writing anything.
   */
  it('yields exactly one winner and never overwrites the original', async () => {
    const attempt = (name) => createSluggedEntity('destinations', 'lonavala', { name, slug: 'lonavala' });

    const results = await Promise.allSettled([attempt('First Writer'), attempt('Second Writer')]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: 11000 });

    const winner = fulfilled[0].value;

    // Exactly one entity document exists, and it is the winner's — the
    // loser never got the chance to clobber it.
    const stored = await collectionDocs('destinations');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(winner._id);
    expect(stored[0].name).toBe(winner.name);
    expect(['First Writer', 'Second Writer']).toContain(stored[0].name);

    // The claim agrees with the surviving document.
    expect(await resolveSlug('lonavala')).toEqual({
      entityId: winner._id,
      collection: 'destinations',
    });
  });

  it('leaves no orphan document when the claim fails', async () => {
    await createSluggedEntity('districts', 'pune', { name: 'Pune', slug: 'pune' });

    await expect(
      createSluggedEntity('districts', 'pune', { name: 'Impostor District', slug: 'pune' })
    ).rejects.toMatchObject({ code: 11000 });

    // The failed transaction wrote nothing: no orphan district, and the
    // original document is byte-for-byte intact.
    const stored = await collectionDocs('districts');
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Pune');
  });

  it('keeps claims independent per entity collection', async () => {
    await createSluggedEntity('districts', 'pune', { name: 'Pune', slug: 'pune' });

    // The claim records which collection owns the slug, so another entity
    // resolving it can tell it is not theirs.
    expect(await resolveSlug('pune')).toEqual({
      entityId: expect.any(String),
      collection: 'districts',
    });
  });
});

describe('releaseSlug()', () => {
  it('frees a slug for re-claiming', async () => {
    await createSluggedEntity('categories', 'wildlife', { name: 'Wildlife', slug: 'wildlife' });
    expect(await resolveSlug('wildlife')).not.toBeNull();

    const db = getFirestore();
    const released = await db.runTransaction(async (transaction) =>
      releaseSlug(transaction, { slug: 'wildlife' })
    );

    expect(released).toBe('wildlife');
    expect(await resolveSlug('wildlife')).toBeNull();

    // The same slug can now be claimed by a different entity.
    const reclaimed = await createSluggedEntity('categories', 'wildlife', {
      name: 'Wildlife Safari',
      slug: 'wildlife',
    });
    expect(reclaimed._id).toBeTruthy();
    expect(await resolveSlug('wildlife')).toEqual({
      entityId: reclaimed._id,
      collection: 'categories',
    });
  });

  it('is a no-op for a slug that was never claimed', async () => {
    const db = getFirestore();
    await expect(
      db.runTransaction(async (transaction) => releaseSlug(transaction, { slug: 'never-claimed' }))
    ).resolves.toBe('never-claimed');
    expect(await resolveSlug('never-claimed')).toBeNull();
  });
});

describe('resolveSlug()', () => {
  it('returns the claiming entity', async () => {
    const created = await createSluggedEntity('places', 'lonavala-fort', {
      name: 'Lonavala Fort',
      slug: 'lonavala-fort',
    });

    expect(await resolveSlug('lonavala-fort')).toEqual({
      entityId: created._id,
      collection: 'places',
    });
  });

  it('resolves through the same normalization used to claim', async () => {
    await createSluggedEntity('places', 'lonavala-fort', { name: 'Lonavala Fort', slug: 'lonavala-fort' });

    const resolved = await resolveSlug('  LONAVALA-FORT ');
    expect(resolved).toMatchObject({ collection: 'places' });
  });

  it('returns null for an unknown slug', async () => {
    expect(await resolveSlug('does-not-exist')).toBeNull();
  });

  it('returns null for an empty slug', async () => {
    expect(await resolveSlug('')).toBeNull();
    expect(await resolveSlug(undefined)).toBeNull();
  });

  it('returns null when the claim document carries no entityId', async () => {
    await getFirestore()
      .collection(CLAIM_COLLECTION)
      .doc('corrupt-claim')
      .set({ collection: 'destinations', slug: 'corrupt-claim', createdAt: new Date() });

    expect(await resolveSlug('corrupt-claim')).toBeNull();
  });
});
