/**
 * Firestore connection — PRD §10 (Database) and §93 (Database Environment
 * Strategy).
 *
 * "Each environment gets its own connection string/project supplied via
 * environment variables, never hardcoded." — §93. Here that means a
 * separate Firebase project per environment (safarup-dev, safarup-staging,
 * safarup-production), selected entirely by which service account
 * credentials are loaded — never a hardcoded project ID.
 *
 * Authentication to Firebase stays custom (JWT + bcrypt, PRD §30) — this
 * module only initializes the Firebase Admin SDK so the backend can read
 * and write Firestore documents. It does NOT use Firebase Authentication.
 *
 * Local development can point at the Firestore emulator instead of a real
 * project by setting FIRESTORE_EMULATOR_HOST (see firebase.json for the
 * matching emulator ports). The emulator is unauthenticated, so
 * config/env.js refuses to start the server if that variable is set while
 * NODE_ENV=production.
 */

const admin = require('firebase-admin');
const env = require('./env');
const logger = require('../utils/logger');

// The Admin SDK requires *some* credential object. When talking to the
// emulator there is nothing real to sign with, so credential.cert() is
// deliberately not used here: it parses the private key strictly and
// would reject a placeholder. applicationDefault() satisfies the SDK
// without parsing a key at all, and grants nothing because the emulator
// does not authenticate. Config/env.js separately refuses to boot in
// production when the emulator is enabled.
// The local Firestore emulator is started as this project ID
// (`npm run emulators` → `firebase emulators:start --only firestore
// --project safarup-dev`). The SDK must address the SAME project, or data
// written by the emulator and data read by the SDK land in different
// projects. Keep this value in step with that script and with
// firebase.json. Override with FIREBASE_PROJECT_ID when needed.
const EMULATOR_PROJECT_ID = 'safarup-dev';

let app = null;
let firestore = null;

function loadServiceAccount() {
  // Preferred in production: the full service account JSON as a single
  // env var (e.g. pasted into a secret manager) — avoids shipping a key
  // file at all. See PRD §95 (Secrets: never commit credentials to Git).
  if (env.firebase.serviceAccountJson) {
    try {
      return JSON.parse(env.firebase.serviceAccountJson);
    } catch (error) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error.message}`);
    }
  }

  // Alternative: a path to a downloaded service account key file (common
  // for local development). Never commit this file — see .gitignore.
  if (env.firebase.serviceAccountPath) {
    // eslint-disable-next-line global-require
    return require(env.firebase.serviceAccountPath);
  }

  return null;
}

async function connectDatabase() {
  if (firestore) {
    return firestore;
  }

  const usingEmulator = Boolean(env.firebase.emulatorHost);

  if (usingEmulator) {
    // The Admin SDK reads FIRESTORE_EMULATOR_HOST to route Firestore
    // traffic to the local emulator. The emulator accepts any credential,
    // so a dummy is supplied to skip service-account discovery entirely.
    // env.js refuses to boot in production when this variable is set.
    process.env.FIRESTORE_EMULATOR_HOST = env.firebase.emulatorHost;
  }

  const serviceAccount = usingEmulator ? null : loadServiceAccount();

  if (!usingEmulator && !serviceAccount && !env.isProduction) {
    // Local/dev convenience: if GOOGLE_APPLICATION_CREDENTIALS is set,
    // admin.initializeApp() with just a projectId can still work. We
    // surface a clear error instead of silently connecting to nothing.
    if (!env.firebase.projectId) {
      throw new Error(
        'No Firebase credentials configured. Set FIREBASE_SERVICE_ACCOUNT_JSON, ' +
          'FIREBASE_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS in your .env.'
      );
    }
  }

  app =
    admin.apps.length > 0
      ? admin.app()
      : admin.initializeApp({
          credential: serviceAccount
            ? admin.credential.cert(serviceAccount)
            : admin.credential.applicationDefault(),
          projectId: env.firebase.projectId || serviceAccount?.project_id || EMULATOR_PROJECT_ID,
        });

  firestore = admin.firestore();
  firestore.settings({ ignoreUndefinedProperties: true });

  // Firestore has no explicit "connect" call — this is a lightweight
  // reachability check so the server can fail fast on boot instead of only
  // discovering a bad credential/project ID on the first real request.
  // The collection name must avoid Firestore's reserved `__`-prefixed
  // collection IDs, otherwise the probe itself is rejected.
  await firestore.collection('healthcheck').limit(1).get();

  logger.info(
    usingEmulator
      ? `Firestore connected [emulator: ${env.firebase.emulatorHost}]`
      : `Firestore connected [project: ${app.options.projectId || 'unknown'}]`
  );

  return firestore;
}

function getFirestore() {
  if (!firestore) {
    throw new Error('Firestore has not been initialized. Call connectDatabase() first.');
  }
  return firestore;
}

async function disconnectDatabase() {
  if (app) {
    await app.delete();
  }
  app = null;
  firestore = null;
}

module.exports = { connectDatabase, disconnectDatabase, getFirestore, admin };
