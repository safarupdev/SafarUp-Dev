/**
 * Vitest configuration — backend test foundation (Phase 0.8).
 *
 * Tests run against the local Firestore emulator (see firebase.json).
 * FIRESTORE_EMULATOR_HOST is injected here, in `test.env`, because
 * Vitest applies it to process.env *before* any test module is loaded.
 * That ordering matters: src/config/env.js reads process.env once at
 * require time, so setting the variable later would be too late and the
 * SDK would try to reach a real project instead of the emulator.
 *
 * CI starts the same emulator before running these tests.
 *
 * Uses .mjs because backend/package.json is CommonJS ("type": "commonjs"),
 * which would make ESM syntax in a .js config ambiguous.
 */
import { defineConfig } from 'vitest/config';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      FIRESTORE_EMULATOR_HOST: EMULATOR_HOST,
    },
    // Transactions and emulator warm-up need headroom on slow CI runners.
    testTimeout: 20000,
    hookTimeout: 30000,
    // All suites share one emulator instance, so files must not race each
    // other over the same collections.
    fileParallelism: false,
  },
});
