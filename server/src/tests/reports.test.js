const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');
const { pool } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('Reports API', () => {
  let authToken;
  let testCustomerId;
  let testBookingId;
  let testVariantId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a valid JWT token for testing
    authToken = jwt.sign(
      { id: 1, email: 'admin@zamutints.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Get a service variant for test data
    const variantResult = await pool.query('SELECT id FROM service_variants LIMIT 1');
    testVariantId = variantResult.rows[0]?.id || 1;

    // Create test customer
    const customerResult = await pool.query(
      `INSERT INTO customers (email, phone, first_name, last_name)
       VALUES ('reporttest@example.com', '555-999-8888', 'Report', 'Tester')
       ON CONFLICT (email) DO UPDATE SET first_name = 'Report'
       RETURNING id`
    );
    testCustomerId = customerResult.rows[0].id;

    // Create test booking with completed status
    const bookingResult = await pool.query(
      `INSERT INTO bookings (customer_id, service_variant_id, appointment_date, appointment_time, status, notes)
       VALUES ($1, $2, CURRENT_DATE, '10:00', 'completed', 'report_test_booking')
       RETURNING id`,
      [testCustomerId, testVariantId]
    );
    testBookingId = bookingResult.rows[0].id;

    // Create test payment
    await pool.query(
      `INSERT INTO payments (booking_id, amount, status, payment_type)
       VALUES ($1, 150.00, 'succeeded', 'full')`,
      [testBookingId]
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE notes = 'report_test_booking')");
    await pool.query("DELETE FROM bookings WHERE notes = 'report_test_booking'");
    await pool.query("DELETE FROM customers WHERE email = 'reporttest@example.com'");
    await pool.end();
  });

  describe('GET /api/admin/reports/sales', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/reports/sales')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return sales summary with valid token', async () => {
      const response = await request(app)
        .get('/api/admin/reports/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('monthRevenue');
      expect(response.body).toHaveProperty('weekRevenue');
      expect(response.body).toHaveProperty('completedBookings');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('revenueByCategory');

      expect(typeof response.body.totalRevenue).toBe('number');
      expect(typeof response.body.monthRevenue).toBe('number');
      expect(typeof response.body.weekRevenue).toBe('number');
      expect(typeof response.body.completedBookings).toBe('number');
      expect(typeof response.body.averageOrderValue).toBe('number');
      expect(Array.isArray(response.body.revenueByCategory)).toBe(true);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/reports/sales')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('GET /api/admin/reports/sales-by-date', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/reports/sales-by-date')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should require startDate and endDate parameters', async () => {
      const response = await request(app)
        .get('/api/admin/reports/sales-by-date')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('startDate and endDate are required');
    });

    it('should return daily sales breakdown with valid dates', async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/admin/reports/sales-by-date')
        .query({ startDate: weekAgo, endDate: today })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const entry = response.body[0];
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('revenue');
        expect(entry).toHaveProperty('bookingCount');
        expect(typeof entry.revenue).toBe('number');
        expect(typeof entry.bookingCount).toBe('number');
      }
    });

    it('should return empty array for date range with no sales', async () => {
      const response = await request(app)
        .get('/api/admin/reports/sales-by-date')
        .query({ startDate: '2000-01-01', endDate: '2000-01-02' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/admin/reports/top-services', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/reports/top-services')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return top services with valid token', async () => {
      const response = await request(app)
        .get('/api/admin/reports/top-services')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const service = response.body[0];
        expect(service).toHaveProperty('serviceName');
        expect(service).toHaveProperty('bookingCount');
        expect(service).toHaveProperty('revenue');
        expect(typeof service.serviceName).toBe('string');
        expect(typeof service.bookingCount).toBe('number');
        expect(typeof service.revenue).toBe('number');
      }
    });

    it('should return at most 10 services', async () => {
      const response = await request(app)
        .get('/api/admin/reports/top-services')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/admin/reports/top-customers', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/reports/top-customers')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return top customers with valid token', async () => {
      const response = await request(app)
        .get('/api/admin/reports/top-customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const customer = response.body[0];
        expect(customer).toHaveProperty('customerName');
        expect(customer).toHaveProperty('email');
        expect(customer).toHaveProperty('totalSpent');
        expect(customer).toHaveProperty('bookingCount');
        expect(typeof customer.customerName).toBe('string');
        expect(typeof customer.email).toBe('string');
        expect(typeof customer.totalSpent).toBe('number');
        expect(typeof customer.bookingCount).toBe('number');
      }
    });

    it('should return at most 10 customers', async () => {
      const response = await request(app)
        .get('/api/admin/reports/top-customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should include the test customer in results', async () => {
      const response = await request(app)
        .get('/api/admin/reports/top-customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const testCustomer = response.body.find(c => c.email === 'reporttest@example.com');
      expect(testCustomer).toBeDefined();
      expect(testCustomer.customerName).toBe('Report Tester');
      expect(testCustomer.totalSpent).toBe(150);
      expect(testCustomer.bookingCount).toBe(1);
    });
  });
});
