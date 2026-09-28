/**
 * One-time bootstrap script to create the first SUPER_ADMIN account.
 *
 * Why this exists: PRD §90/§91 require that admin privileges are never
 * granted through client input, and the public /auth/register endpoint
 * (§30) only ever creates CUSTOMER accounts (see auth.service.js). That
 * means there is intentionally no API route that can create the first
 * administrator — it must be provisioned out-of-band, directly against the
 * database, by whoever controls the server/environment.
 *
 * Usage (from the backend/ directory):
 *   node src/scripts/seedSuperAdmin.js --email admin@safarup.in --password "StrongPass123" --name "Super Admin"
 *
 * Safe to re-run: if a Super Admin already exists, it exits without
 * making changes rather than creating a duplicate.
 */

const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const User = require('../models/User.model');
const { ROLES } = require('../constants/roles');
const env = require('../config/env');
const logger = require('../utils/logger');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email?.trim().toLowerCase();
  const password = args.password;
  const displayName = args.name || 'Super Admin';

  if (!email || !password) {
    logger.error(
      'Usage: node src/scripts/seedSuperAdmin.js --email <email> --password <password> --name "<name>"'
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    logger.error('Password must be at least 8 characters.');
    process.exitCode = 1;
    return;
  }

  await connectDatabase();

  const existingSuperAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existingSuperAdmin) {
    logger.info('A Super Admin already exists. Skipping seed.', {
      email: existingSuperAdmin.email,
    });
    await disconnectDatabase();
    return;
  }

  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    logger.error('A user with this email already exists. Choose a different email.');
    await disconnectDatabase();
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  const superAdmin = await User.create({
    email,
    passwordHash,
    displayName,
    role: ROLES.SUPER_ADMIN,
    authProvider: 'local',
    emailVerified: true, // bootstrap account: trusted by definition, skip the email loop
    status: 'active',
  });

  logger.info('Super Admin created successfully.', {
    id: superAdmin._id,
    email: superAdmin.email,
  });

  await disconnectDatabase();
}

main().catch((error) => {
  logger.error('Seed script failed', { error: error.message });
  process.exitCode = 1;
});
