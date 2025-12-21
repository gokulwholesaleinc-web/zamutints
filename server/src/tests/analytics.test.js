
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');
const { pool } = require('../db/pool');

describe('Analytics API', () => {
  let authToken;
  let testCustomerId;
  let testBookingId;
  let testVariantId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get a service variant for test bookings
    const variantResult = await pool.query('SELECT id FROM service_variants LIMIT 1');
    testVariantId = variantResult.rows[0]?.id || 1;

    // Create test customer
    const customerResult = await pool.query(
      `INSERT INTO customers (email, phone, first_name, last_name)
       VALUES ('analytics-test@example.com', '555-TEST', 'Analytics', 'TestUser')
       ON CONFLICT (email) DO UPDATE SET first_name = 'Analytics'
       RETURNING id`
    );
    testCustomerId = customerResult.rows[0].id;

    // Create a completed test booking for analytics
    const bookingResult = await pool.query(
      `INSERT INTO bookings
       (customer_id, service_variant_id, vehicle_year, vehicle_make, vehicle_model,
        appointment_date, appointment_time, notes, deposit_amount, total_amount, status)
       VALUES ($1, $2, 2024, 'Test', 'Car', CURRENT_DATE, '10:00', 'analytics test', 35.00, 200.00, 'completed')
       RETURNING id`,
      [testCustomerId, testVariantId]
    );
    testBookingId = bookingResult.rows[0].id;

    // Create a test payment
    await pool.query(
      `INSERT INTO payments (booking_id, amount, status, payment_type)
       VALUES ($1, 200.00, 'succeeded', 'full')`,
      [testBookingId]
    );

    // Create an admin JWT token for authentication
    authToken = jwt.sign(
      { id: 1, email: 'test@admin.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM payments WHERE booking_id = $1", [testBookingId]);
    await pool.query("DELETE FROM bookings WHERE notes = 'analytics test'");
    await pool.query("DELETE FROM customers WHERE email = 'analytics-test@example.com'");
    await pool.end();
  });

  describe('GET /api/admin/analytics/overview', () => {
    it('should return overview stats with authentication', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalBookings');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('avgTicket');
      expect(response.body).toHaveProperty('retentionRate');
      expect(response.body).toHaveProperty('dateRange');
      expect(typeof response.body.totalBookings).toBe('number');
      expect(typeof response.body.totalRevenue).toBe('number');
    });

    it('should accept date range parameters', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/admin/analytics/overview?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dateRange.start).toBe(startDate);
      expect(response.body.dateRange.end).toBe(endDate);
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/overview')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/analytics/popular-services', () => {
    it('should return popular services data', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/popular-services')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('dateRange');
      expect(Array.isArray(response.body.services)).toBe(true);

      if (response.body.services.length > 0) {
        const service = response.body.services[0];
        expect(service).toHaveProperty('serviceName');
        expect(service).toHaveProperty('bookingCount');
        expect(service).toHaveProperty('revenue');
        expect(service).toHaveProperty('percentage');
      }
    });

    it('should accept date range parameters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/admin/analytics/popular-services?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dateRange.start).toBe(startDate);
      expect(response.body.dateRange.end).toBe(endDate);
    });
  });

  describe('GET /api/admin/analytics/peak-hours', () => {
    it('should return peak hours heatmap data', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/peak-hours')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('heatmap');
      expect(response.body).toHaveProperty('hours');
      expect(response.body).toHaveProperty('dateRange');
      expect(Array.isArray(response.body.heatmap)).toBe(true);
      expect(Array.isArray(response.body.hours)).toBe(true);

      // Should have 7 days
      expect(response.body.heatmap.length).toBe(7);

      if (response.body.heatmap.length > 0) {
        const day = response.body.heatmap[0];
        expect(day).toHaveProperty('day');
        expect(day).toHaveProperty('dayIndex');
        expect(day).toHaveProperty('hours');
        expect(Array.isArray(day.hours)).toBe(true);
      }
    });

    it('should include busiest day and hour when data exists', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/peak-hours')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // These may be null if no bookings exist
      expect(response.body).toHaveProperty('busiestDay');
      expect(response.body).toHaveProperty('busiestHour');
    });
  });

  describe('GET /api/admin/analytics/customer-retention', () => {
    it('should return customer retention data', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/customer-retention')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('newCustomers');
      expect(response.body).toHaveProperty('returningCustomers');
      expect(response.body).toHaveProperty('totalCustomers');
      expect(response.body).toHaveProperty('retentionRate');
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body).toHaveProperty('dateRange');

      expect(typeof response.body.newCustomers).toBe('number');
      expect(typeof response.body.retentionRate).toBe('number');
      expect(Array.isArray(response.body.breakdown)).toBe(true);
    });

    it('should have breakdown with new and returning customer segments', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/customer-retention')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.breakdown.length).toBe(2);
      expect(response.body.breakdown[0]).toHaveProperty('label');
      expect(response.body.breakdown[0]).toHaveProperty('value');
      expect(response.body.breakdown[0]).toHaveProperty('percentage');
    });
  });

  describe('GET /api/admin/analytics/revenue-trends', () => {
    it('should return revenue trends with default weekly grouping', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/revenue-trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalBookings');
      expect(response.body).toHaveProperty('avgRevenue');
      expect(response.body).toHaveProperty('groupBy');
      expect(response.body).toHaveProperty('dateRange');

      expect(Array.isArray(response.body.trends)).toBe(true);
      expect(response.body.groupBy).toBe('week');
    });

    it('should accept groupBy parameter for daily trends', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/revenue-trends?groupBy=day')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.groupBy).toBe('day');
    });

    it('should accept groupBy parameter for monthly trends', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/revenue-trends?groupBy=month')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.groupBy).toBe('month');
    });

    it('should include growth percentage in trends', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/revenue-trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.trends.length > 0) {
        const trend = response.body.trends[0];
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('revenue');
        expect(trend).toHaveProperty('bookingCount');
        expect(trend).toHaveProperty('growth');
      }
    });
  });

  describe('GET /api/admin/analytics/conversion', () => {
    it('should return conversion statistics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/conversion')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalBookings');
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body).toHaveProperty('conversionRate');
      expect(response.body).toHaveProperty('cancellationRate');
      expect(response.body).toHaveProperty('noShowRate');
      expect(response.body).toHaveProperty('dateRange');

      expect(typeof response.body.conversionRate).toBe('number');
      expect(typeof response.body.cancellationRate).toBe('number');
      expect(typeof response.body.noShowRate).toBe('number');
    });

    it('should have breakdown by booking status', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/conversion')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.breakdown)).toBe(true);

      // Should have entries for different statuses
      const statuses = response.body.breakdown.map(b => b.status);
      expect(statuses).toContain('Completed');
      expect(statuses).toContain('Cancelled');
    });

    it('should accept date range parameters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/admin/analytics/conversion?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dateRange.start).toBe(startDate);
      expect(response.body.dateRange.end).toBe(endDate);
    });
  });

  describe('Authentication Requirements', () => {
    const endpoints = [
      '/api/admin/analytics/overview',
      '/api/admin/analytics/popular-services',
      '/api/admin/analytics/peak-hours',
      '/api/admin/analytics/customer-retention',
      '/api/admin/analytics/revenue-trends',
      '/api/admin/analytics/conversion',
    ];

    endpoints.forEach((endpoint) => {
      it(`${endpoint} should require authentication`, async () => {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it(`${endpoint} should reject invalid token`, async () => {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', 'Bearer invalid-token')
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
