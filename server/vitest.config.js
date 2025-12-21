import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['src/tests/**/*.test.js'],
    sequence: {
      shuffle: false,
    },
    env: {
      DATABASE_URL: 'postgresql://zamutints:zamutints_dev_password@localhost:5433/zamutints',
      JWT_SECRET: 'test_jwt_secret_for_testing',
    },
  },
});
