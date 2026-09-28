/**
 * Centralized environment configuration.
 *
 * PRD §92 (Environment Strategy) and §95 (Secrets): secrets must come from
 * environment variables, never be hardcoded, and never be committed to Git.
 * This module is the single place that reads `process.env`, validates that
 * required values are present, and fails fast on boot if something critical
 * is missing — better to crash at startup than to run with a missing JWT
 * secret in production.
 */

require('dotenv').config();

const REQUIRED_IN_PRODUCTION = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if ((value === undefined || value === '') && isProduction) {
    throw new Error(
      `Missing required environment variable "${name}". Refusing to start in production without it.`
    );
  }
  return value;
}

const env = {
  nodeEnv,
  isProduction,
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',

  port: Number(process.env.PORT) || 4000,

  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Firebase/Firestore — PRD §10, §93. Exactly one credential source is
  // required: a full service-account JSON blob (recommended for
  // production secret managers), a path to a downloaded key file
  // (common for local dev), or ambient GOOGLE_APPLICATION_CREDENTIALS.
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || undefined,
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || undefined,
  },

  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET', 'dev-only-insecure-access-secret'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET', 'dev-only-insecure-refresh-secret'),
    // PRD §30: "short-lived access tokens + refresh tokens".
    accessTokenTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTokenTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  cookies: {
    // PRD §30: tokens stored in httpOnly secure cookies.
    secure: isProduction,
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  clientUrls: {
    public: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
    admin: process.env.ADMIN_APP_URL || 'http://localhost:5174',
  },
};

if (isProduction) {
  for (const key of REQUIRED_IN_PRODUCTION) {
    requireEnv(key);
  }
  if (!env.firebase.serviceAccountJson && !env.firebase.serviceAccountPath) {
    throw new Error(
      'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or ' +
        'FIREBASE_SERVICE_ACCOUNT_PATH. Refusing to start in production without them.'
    );
  }
}

module.exports = env;
