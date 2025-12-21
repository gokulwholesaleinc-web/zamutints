const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { pool } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('Business Settings API', () => {
  let superAdminToken;
  let adminToken;

  beforeAll(async () => {
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create tokens for testing
    superAdminToken = jwt.sign(
      { id: 1, email: 'super@test.com', role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: 2, email: 'admin@test.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Ensure business_settings has a row for testing
    await pool.query(`
      INSERT INTO business_settings (business_name, phone, city, state, instagram_url, deposit_amount)
      SELECT 'Zamu Tints', '872-203-1857', 'Chicago', 'IL', 'https://instagram.com/zamutints', 35.00
      WHERE NOT EXISTS (SELECT 1 FROM business_settings LIMIT 1)
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/services/business-info (public)', () => {
    it('should return public business info without authentication', async () => {
      const response = await request(app)
        .get('/api/services/business-info')
        .expect(200);

      expect(response.body).toHaveProperty('business_name');
      expect(response.body).toHaveProperty('phone');
      expect(response.body).toHaveProperty('city');
      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('deposit_amount');
      expect(response.body).toHaveProperty('instagram_url');

      // Should NOT include cancellation_policy (sensitive data)
      expect(response.body).not.toHaveProperty('cancellation_policy');
      expect(response.body).not.toHaveProperty('updated_at');
    });

    it('should return default values', async () => {
      const response = await request(app)
        .get('/api/services/business-info')
        .expect(200);

      expect(response.body.business_name).toBe('Zamu Tints');
      expect(response.body.city).toBe('Chicago');
      expect(response.body.state).toBe('IL');
    });
  });

  describe('GET /api/admin/business-settings', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/business-settings')
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should return all business settings with valid token', async () => {
      const response = await request(app)
        .get('/api/admin/business-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('business_name');
      expect(response.body).toHaveProperty('phone');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('address_line1');
      expect(response.body).toHaveProperty('address_line2');
      expect(response.body).toHaveProperty('city');
      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('zip');
      expect(response.body).toHaveProperty('logo_url');
      expect(response.body).toHaveProperty('instagram_url');
      expect(response.body).toHaveProperty('tiktok_url');
      expect(response.body).toHaveProperty('deposit_amount');
      expect(response.body).toHaveProperty('cancellation_policy');
      expect(response.body).toHaveProperty('updated_at');
    });

    it('should allow regular admin to read settings', async () => {
      const response = await request(app)
        .get('/api/admin/business-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('business_name');
    });
  });

  describe('PUT /api/admin/business-settings', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/admin/business-settings')
        .send({ businessName: 'New Name' })
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should return 403 for regular admin (not super_admin)', async () => {
      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ businessName: 'New Name' })
        .expect(403);

      expect(response.body.error).toContain('permission');
    });

    it('should update settings with super_admin role', async () => {
      const updatedPhone = '555-123-4567';

      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ phone: updatedPhone })
        .expect(200);

      expect(response.body.phone).toBe(updatedPhone);

      // Restore original value
      await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ phone: '872-203-1857' });
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        businessName: 'Zamu Tints Pro',
        city: 'Naperville',
        depositAmount: 50.00
      };

      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.business_name).toBe('Zamu Tints Pro');
      expect(response.body.city).toBe('Naperville');
      expect(parseFloat(response.body.deposit_amount)).toBe(50.00);

      // Restore original values
      await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          businessName: 'Zamu Tints',
          city: 'Chicago',
          depositAmount: 35.00
        });
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject negative deposit amount', async () => {
      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ depositAmount: -10 })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should update social media URLs', async () => {
      const updates = {
        instagramUrl: 'https://instagram.com/zamutints_new',
        tiktokUrl: 'https://tiktok.com/@zamutints'
      };

      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.instagram_url).toBe('https://instagram.com/zamutints_new');
      expect(response.body.tiktok_url).toBe('https://tiktok.com/@zamutints');

      // Restore original values
      await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          instagramUrl: 'https://instagram.com/zamutints',
          tiktokUrl: null
        });
    });

    it('should update cancellation policy', async () => {
      const policy = 'All deposits are non-refundable. Cancellations must be made 24 hours in advance.';

      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ cancellationPolicy: policy })
        .expect(200);

      expect(response.body.cancellation_policy).toBe(policy);
    });

    it('should preserve existing values when updating partial fields', async () => {
      // Get current settings
      const current = await request(app)
        .get('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const originalPhone = current.body.phone;

      // Update only city
      const response = await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ city: 'Evanston' })
        .expect(200);

      // Phone should remain unchanged
      expect(response.body.phone).toBe(originalPhone);
      expect(response.body.city).toBe('Evanston');

      // Restore
      await request(app)
        .put('/api/admin/business-settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ city: 'Chicago' });
    });
  });
});
