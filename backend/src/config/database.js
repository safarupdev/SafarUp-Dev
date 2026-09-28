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
 */

const admin = require('firebase-admin');
const env = require('./env');
const logger = require('../utils/logger');

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
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(env.firebase.serviceAccountPath);
  }

  return null;
}

async function connectDatabase() {
  if (firestore) {
    return firestore;
  }

  const serviceAccount = loadServiceAccount();

  if (!serviceAccount && !env.isProduction) {
    // Local/dev convenience: if GOOGLE_APPLICATION_CREDENTIALS is set, or
    // the Firebase emulator suite is running, admin.initializeApp() with
    // just a projectId can still work. We surface a clear error instead
    // of silently connecting to nothing.
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
          projectId: env.firebase.projectId || serviceAccount?.project_id,
        });

  firestore = admin.firestore();
  firestore.settings({ ignoreUndefinedProperties: true });

  // Firestore has no explicit "connect" call — this is a lightweight
  // reachability check so the server can fail fast on boot (matching the
  // previous MongoDB behavior) instead of only discovering a bad
  // credential/project ID on the first real request.
  await firestore.collection('__healthcheck__').limit(1).get();

  logger.info(`Firestore connected [project: ${app.options.projectId || 'unknown'}]`);

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
