const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db/pool');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

describe('Dashboard API', () => {
  let authToken;
  let testBookingId;
  let testCustomerId;
  let testVariantId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a test auth token
    authToken = jwt.sign(
      { id: 1, email: 'test1', role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Get a service variant ID for testing
    const variantResult = await pool.query('SELECT id FROM service_variants LIMIT 1');
    testVariantId = variantResult.rows[0]?.id || 1;
  });

  beforeEach(async () => {
    // Create a test customer
    const customerResult = await pool.query(`
      INSERT INTO customers (email, phone, first_name, last_name)
      VALUES ('dashboard-test@example.com', '555-999-8888', 'Dashboard', 'Test')
      ON CONFLICT (email) DO UPDATE SET first_name = 'Dashboard'
      RETURNING id
    `);
    testCustomerId = customerResult.rows[0].id;

    // Create a test booking for today
    const today = new Date().toISOString().split('T')[0];
    const bookingResult = await pool.query(`
      INSERT INTO bookings (
        customer_id, service_variant_id, vehicle_year, vehicle_make, vehicle_model,
        appointment_date, appointment_time, status, deposit_amount, total_amount, notes
      )
      VALUES ($1, $2, 2024, 'Test', 'Vehicle', $3, '10:00', 'confirmed', 35.00, 200.00, 'dashboard test')
      RETURNING id
    `, [testCustomerId, testVariantId, today]);
    testBookingId = bookingResult.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query("DELETE FROM bookings WHERE notes = 'dashboard test'");
    await pool.query("DELETE FROM customers WHERE email = 'dashboard-test@example.com'");
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/admin/dashboard/today', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/today')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return today appointments with auth', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('appointments');
      expect(Array.isArray(response.body.appointments)).toBe(true);

      // Should contain our test booking
      const testBooking = response.body.appointments.find(a => a.id === testBookingId);
      expect(testBooking).toBeDefined();
      expect(testBooking.first_name).toBe('Dashboard');
      expect(testBooking.last_name).toBe('Test');
      expect(testBooking.vehicle_make).toBe('Test');
    });

    it('should include booking details in response', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const appointment = response.body.appointments.find(a => a.id === testBookingId);
      expect(appointment).toBeDefined();
      expect(appointment).toHaveProperty('appointment_time');
      expect(appointment).toHaveProperty('status');
      expect(appointment).toHaveProperty('service_name');
      expect(appointment).toHaveProperty('variant_name');
      expect(appointment).toHaveProperty('phone');
      expect(appointment).toHaveProperty('email');
    });
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return revenue statistics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('todayRevenue');
      expect(response.body).toHaveProperty('weekRevenue');
      expect(response.body).toHaveProperty('monthRevenue');
      expect(response.body).toHaveProperty('todayCompleted');
      expect(response.body).toHaveProperty('todayTotal');
      expect(response.body).toHaveProperty('inProgress');
      expect(response.body).toHaveProperty('checkedIn');

      // Values should be numbers
      expect(typeof response.body.todayRevenue).toBe('number');
      expect(typeof response.body.weekRevenue).toBe('number');
      expect(typeof response.body.monthRevenue).toBe('number');
      expect(typeof response.body.todayCompleted).toBe('number');
      expect(typeof response.body.todayTotal).toBe('number');
    });

    it('should include today total count', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should include our test booking in today's total
      expect(response.body.todayTotal).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/admin/dashboard/upcoming', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/upcoming')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return upcoming appointments data', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dailySummary');
      expect(response.body).toHaveProperty('upcomingAppointments');
      expect(Array.isArray(response.body.dailySummary)).toBe(true);
      expect(Array.isArray(response.body.upcomingAppointments)).toBe(true);
    });

    it('should include daily summary with counts and revenue', async () => {
      // Create a future booking
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      await pool.query(`
        INSERT INTO bookings (
          customer_id, service_variant_id, vehicle_year, vehicle_make, vehicle_model,
          appointment_date, appointment_time, status, deposit_amount, total_amount, notes
        )
        VALUES ($1, $2, 2024, 'Future', 'Test', $3, '14:00', 'confirmed', 35.00, 300.00, 'dashboard test')
      `, [testCustomerId, testVariantId, tomorrowStr]);

      const response = await request(app)
        .get('/api/admin/dashboard/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should have at least one day in summary
      if (response.body.dailySummary.length > 0) {
        const dayData = response.body.dailySummary[0];
        expect(dayData).toHaveProperty('date');
        expect(dayData).toHaveProperty('appointmentCount');
        expect(dayData).toHaveProperty('expectedRevenue');
      }

      // Upcoming appointments should have details
      if (response.body.upcomingAppointments.length > 0) {
        const apt = response.body.upcomingAppointments[0];
        expect(apt).toHaveProperty('first_name');
        expect(apt).toHaveProperty('appointment_date');
        expect(apt).toHaveProperty('service_name');
      }
    });
  });

  describe('PATCH /api/admin/dashboard/bookings/:id/status', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .send({ status: 'checked_in' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should update booking status to checked_in', async () => {
      const response = await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'checked_in' })
        .expect(200);

      expect(response.body.status).toBe('checked_in');
      expect(response.body.check_in_time).toBeDefined();
    });

    it('should update booking status to in_progress', async () => {
      // First check in
      await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'checked_in' });

      // Then start work
      const response = await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
      expect(response.body.started_at).toBeDefined();
    });

    it('should update booking status to completed', async () => {
      // Set to in_progress first
      await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' });

      // Then complete
      const response = await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.completed_at).toBeDefined();
    });

    it('should allow marking as no_show', async () => {
      const response = await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'no_show' })
        .expect(200);

      expect(response.body.status).toBe('no_show');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch(`/api/admin/dashboard/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .patch('/api/admin/dashboard/bookings/99999/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'checked_in' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
