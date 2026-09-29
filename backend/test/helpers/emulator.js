/**
 * Shared test setup — connects every suite to the local Firestore
 * emulator and isolates suites from each other's data.
 *
 * Emulator details:
 *   - FIRESTORE_EMULATOR_HOST is injected by vitest.config.mjs before
 *     modules load, so src/config/env.js picks it up on first require.
 *   - No service-account credentials are required or used. The emulator
 *     accepts any credential, so tests never touch a real project.
 *
 * If the emulator is not running, requireEmulator() throws with an
 * actionable message instead of letting a test fail deep inside a query.
 *
 * This helper is CommonJS and loaded via createRequire() from the ESM
 * test files, so it shares the module cache with the application modules
 * under test (critical: config/database.js holds a single `firestore`
 * instance, so both must see the same module instance).
 */

const {
  connectDatabase,
  disconnectDatabase,
  getFirestore,
} = require('../../src/config/database');

let connected = false;

/** Connects to the emulator. Safe to call from every suite. */
async function requireEmulator() {
  if (connected) {
    return getFirestore();
  }

  const host = process.env.FIRESTORE_EMULATOR_HOST;

  try {
    await connectDatabase();
    connected = true;
    return getFirestore();
  } catch (error) {
    throw new Error(
      `Could not connect to the Firestore emulator at ${host}.\n` +
        'Start it with:\n' +
        '  npx firebase emulators:start --only firestore --project safarup-dev\n' +
        `Underlying error: ${error.message}`
    );
  }
}

/** Removes every document from a collection, so suites start clean. */
async function clearCollection(name) {
  const db = getFirestore();
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) {
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

/** Best-effort teardown; a failure here must not mask a test failure. */
async function teardown() {
  try {
    if (connected) {
      await disconnectDatabase();
      connected = false;
    }
  } catch {
    // ignore — emulator shutdown noise is not actionable in a test run
  }
}

module.exports = { requireEmulator, clearCollection, teardown };
