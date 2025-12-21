const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const request = require('supertest');
const app = require('../index');
const { pool } = require('../db/pool');

describe('Services API', () => {
  beforeAll(async () => {
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/services', () => {
    it('should return all active services', async () => {
      const response = await request(app)
        .get('/api/services')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check service structure
      const service = response.body[0];
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('category');
      expect(service).toHaveProperty('base_price');
      expect(service).toHaveProperty('variants');
    });

    it('should include service variants', async () => {
      const response = await request(app)
        .get('/api/services')
        .expect(200);

      // Find a service with variants (window tint)
      const tintService = response.body.find(s => s.category === 'window_tint');
      expect(tintService).toBeDefined();
      expect(Array.isArray(tintService.variants)).toBe(true);

      if (tintService.variants.length > 0) {
        const variant = tintService.variants[0];
        expect(variant).toHaveProperty('id');
        expect(variant).toHaveProperty('name');
        expect(variant).toHaveProperty('price');
      }
    });
  });

  describe('GET /api/services/:id', () => {
    it('should return a single service by ID', async () => {
      // First get all services to get a valid ID
      const listResponse = await request(app).get('/api/services');
      const serviceId = listResponse.body[0].id;

      const response = await request(app)
        .get(`/api/services/${serviceId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', serviceId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('variants');
    });

    it('should return 404 for non-existent service', async () => {
      const response = await request(app)
        .get('/api/services/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/services/category/:category', () => {
    it('should return services filtered by category', async () => {
      const response = await request(app)
        .get('/api/services/category/window_tint')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(service => {
        expect(service.category).toBe('window_tint');
      });
    });

    it('should return empty array for non-existent category', async () => {
      const response = await request(app)
        .get('/api/services/category/nonexistent')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });
});
