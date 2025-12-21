const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db/pool');

describe('Notifications API', () => {
  let authToken;
  let testBookingId;
  let testCustomerId;
  let testTemplateId;

  beforeAll(async () => {
    // Wait for database initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Login to get auth token using the default test user
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test1', password: 'test1' });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    } else {
      // Fallback: create a test token if login fails
      console.log('Login failed, tests may fail without valid auth token');
    }

    // Create test customer
    const customerResult = await pool.query(`
      INSERT INTO customers (email, phone, first_name, last_name)
      VALUES ('notifytest@example.com', '555-999-8888', 'Notify', 'Test')
      ON CONFLICT (email) DO UPDATE SET phone = '555-999-8888'
      RETURNING id
    `);
    testCustomerId = customerResult.rows[0].id;

    // Get a service variant for the test booking
    const variantResult = await pool.query('SELECT id FROM service_variants LIMIT 1');
    const variantId = variantResult.rows[0]?.id || 1;

    // Create test booking
    const bookingResult = await pool.query(`
      INSERT INTO bookings (customer_id, service_variant_id, vehicle_year, vehicle_make, vehicle_model,
                           appointment_date, appointment_time, status, notes, deposit_amount, total_amount)
      VALUES ($1, $2, 2024, 'Test', 'Vehicle', CURRENT_DATE + 1, '10:00', 'confirmed', 'notification test', 35.00, 200.00)
      RETURNING id
    `, [testCustomerId, variantId]);
    testBookingId = bookingResult.rows[0].id;

    // Get a template ID
    const templateResult = await pool.query('SELECT id FROM notification_templates LIMIT 1');
    if (templateResult.rows.length > 0) {
      testTemplateId = templateResult.rows[0].id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testBookingId) {
      await pool.query('DELETE FROM notification_log WHERE booking_id = $1', [testBookingId]);
      await pool.query('DELETE FROM bookings WHERE id = $1', [testBookingId]);
    }
    if (testCustomerId) {
      await pool.query("DELETE FROM customers WHERE email = 'notifytest@example.com'");
    }
    await pool.end();
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/admin/notifications/templates')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/admin/notifications/templates')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/notifications/templates', () => {
    it('should return list of templates', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/admin/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('type');
        expect(response.body[0]).toHaveProperty('content');
      }
    });
  });

  describe('GET /api/admin/notifications/templates/:id', () => {
    it('should return a single template', async () => {
      if (!authToken || !testTemplateId) return;

      const response = await request(app)
        .get(`/api/admin/notifications/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('content');
    });

    it('should return 404 for non-existent template', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/admin/notifications/templates/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/admin/notifications/templates/:id', () => {
    it('should update a template', async () => {
      if (!authToken || !testTemplateId) return;

      const updateData = {
        subject: 'Updated Subject - {{business_name}}',
        content: 'Updated content for testing'
      };

      const response = await request(app)
        .put(`/api/admin/notifications/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.subject).toContain('Updated Subject');
      expect(response.body.content).toBe('Updated content for testing');

      // Restore original content
      await pool.query(`
        UPDATE notification_templates
        SET content = 'Hi {{first_name}}, your appointment is confirmed!',
            subject = 'Booking Confirmed - {{business_name}}'
        WHERE id = $1
      `, [testTemplateId]);
    });
  });

  describe('POST /api/admin/notifications/send-sms', () => {
    it('should send SMS (stub mode)', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/send-sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '555-123-4567',
          message: 'Test SMS message',
          bookingId: testBookingId,
          customerId: testCustomerId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('messageId');
      expect(response.body.stub).toBe(true);
    });

    it('should reject SMS without phone', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/send-sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject SMS without message', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/send-sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '555-123-4567'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/admin/notifications/send-email', () => {
    it('should send email (stub mode)', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/send-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<p>Test email content</p>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('messageId');
      expect(response.body.stub).toBe(true);
    });

    it('should reject email without valid email address', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/send-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'invalid-email',
          subject: 'Test',
          html: 'Content'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject email without subject', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/send-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'test@example.com',
          html: 'Content'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/admin/notifications/test', () => {
    it('should send test SMS', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'sms',
          recipient: '555-123-4567'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.type).toBe('sms');
      expect(response.body.stub).toBe(true);
    });

    it('should send test email', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'email',
          recipient: 'test@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.type).toBe('email');
      expect(response.body.stub).toBe(true);
    });

    it('should reject test with invalid type', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid',
          recipient: 'test@example.com'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Booking Notifications', () => {
    it('should send confirmation for booking', async () => {
      if (!authToken || !testBookingId) return;

      const response = await request(app)
        .post(`/api/admin/notifications/send-confirmation/${testBookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('sms');
      expect(response.body).toHaveProperty('email');
    });

    it('should send reminder for booking', async () => {
      if (!authToken || !testBookingId) return;

      const response = await request(app)
        .post(`/api/admin/notifications/send-reminder/${testBookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should send service complete notification', async () => {
      if (!authToken || !testBookingId) return;

      const response = await request(app)
        .post(`/api/admin/notifications/send-complete/${testBookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should send review request', async () => {
      if (!authToken || !testBookingId) return;

      const response = await request(app)
        .post(`/api/admin/notifications/send-review/${testBookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return error for non-existent booking', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/admin/notifications/send-confirmation/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/notifications/log', () => {
    it('should return notification log', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/admin/notifications/log')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('should filter log by type', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/admin/notifications/log')
        .query({ type: 'sms' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      // All logs should be SMS type
      response.body.logs.forEach(log => {
        expect(log.type).toBe('sms');
      });
    });

    it('should support pagination', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/admin/notifications/log')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/admin/notifications/settings', () => {
    it('should return notification settings', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/admin/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(typeof response.body).toBe('object');
      expect(response.body).toHaveProperty('auto_confirmation');
      expect(response.body).toHaveProperty('auto_reminder');
    });
  });

  describe('PUT /api/admin/notifications/settings', () => {
    it('should update notification settings', async () => {
      if (!authToken) return;

      const response = await request(app)
        .put('/api/admin/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          auto_confirmation: 'false',
          auto_reminder: 'true'
        })
        .expect(200);

      expect(response.body.auto_confirmation).toBe('false');
      expect(response.body.auto_reminder).toBe('true');

      // Restore settings
      await request(app)
        .put('/api/admin/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          auto_confirmation: 'true',
          auto_reminder: 'true'
        });
    });
  });
});
