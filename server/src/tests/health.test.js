const { describe, it, expect, afterAll } = require('vitest');
const request = require('supertest');
const app = require('../index');
const { pool } = require('../db/pool');

describe('Health API', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
