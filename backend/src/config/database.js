/**
 * MongoDB connection — PRD §10 (Database) and §93 (Database Environment Strategy).
 *
 * "Each environment gets its own connection string (MONGODB_URI) supplied
 * via environment variables, never hardcoded." — §93
 */

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

let isConnected = false;

async function connectDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info(`MongoDB connected: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error: error.message });
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri, {
    autoIndex: !env.isProduction,
    // Fail fast rather than retrying/hanging indefinitely if no MongoDB
    // instance is reachable (e.g. missing/misconfigured MONGODB_URI).
    serverSelectionTimeoutMS: 8000,
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = { connectDatabase, disconnectDatabase, mongoose };
