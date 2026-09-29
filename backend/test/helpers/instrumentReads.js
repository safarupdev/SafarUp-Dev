/**
 * Firestore read-counting probe — FIRESTORE.destination.contract.md §5
 * ("No N+1").
 *
 * Wraps `Firestore.collection` so a test can count reads and record which
 * collections were touched. An N+1 implementation shows up as a read count
 * that grows with the number of references, so comparing a small page
 * against a large one is what proves the batched path.
 *
 * Shared by the repository and API suites: both need the same probe, and a
 * private copy per file would let the two drift apart.
 *
 * CommonJS, so it shares the module cache with the application modules
 * (critical: config/database.js holds a single `firestore` instance).
 */

const { getFirestore } = require('../../src/config/database');

/**
 * Query-builder methods. Each returns a NEW Firestore query object, so each
 * one has to be decorated again — otherwise a chain such as
 * `collection().orderBy().limit().get()` escapes the probe and the read is
 * never counted.
 */
const BUILDERS = [
  'doc',
  'where',
  'orderBy',
  'limit',
  'limitToLast',
  'offset',
  'startAt',
  'startAfter',
  'endAt',
  'endBefore',
  'select',
  'withConverter',
];

/**
 * @returns {{ collectionsRead: () => string[], reads: () => number, restore: () => void }}
 */
function instrumentReads() {
  const db = getFirestore();
  const hadOwn = Object.prototype.hasOwnProperty.call(db, 'collection');
  const originalCollection = db.collection;

  const collections = new Set();
  const decorated = new WeakSet();
  let reads = 0;

  const decorate = (target) => {
    if (!target || decorated.has(target)) return target;
    decorated.add(target);

    const originalGet = target.get.bind(target);
    target.get = (...getArgs) => {
      reads += 1;
      return originalGet(...getArgs);
    };

    for (const name of BUILDERS) {
      if (typeof target[name] !== 'function') continue;
      const original = target[name].bind(target);
      target[name] = (...args) => decorate(original(...args));
    }

    return target;
  };

  db.collection = (name) => {
    collections.add(name);
    return decorate(originalCollection.call(db, name));
  };

  return {
    collectionsRead: () => [...collections].sort(),
    reads: () => reads,
    restore: () => {
      if (hadOwn) db.collection = originalCollection;
      else delete db.collection;
    },
  };
}

module.exports = { instrumentReads };
