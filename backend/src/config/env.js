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
  'MONGODB_URI',
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

  mongoUri: requireEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017/safarup-dev'),

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
}

module.exports = env;
