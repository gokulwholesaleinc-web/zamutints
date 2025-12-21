const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const request = require('supertest');
const app = require('../index');
const { pool } = require('../db/pool');

describe('Bookings API', () => {
  let testVariantId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get a service variant ID for testing
    const result = await pool.query('SELECT id FROM service_variants LIMIT 1');
    testVariantId = result.rows[0]?.id || 1;
  });

  afterAll(async () => {
    // Clean up test bookings
    await pool.query("DELETE FROM bookings WHERE notes = 'test booking'");
    await pool.query("DELETE FROM customers WHERE email = 'test@example.com'");
    await pool.end();
  });

  describe('GET /api/bookings/availability/:date', () => {
    it('should return available time slots for a valid date', async () => {
      // Use a date in the future (Monday)
      const futureDate = getNextMonday();

      const response = await request(app)
        .get(`/api/bookings/availability/${futureDate}`)
        .query({ serviceVariantId: testVariantId })
        .expect(200);

      expect(response.body).toHaveProperty('available');
      expect(response.body).toHaveProperty('slots');
      expect(Array.isArray(response.body.slots)).toBe(true);

      if (response.body.available && response.body.slots.length > 0) {
        const slot = response.body.slots[0];
        expect(slot).toHaveProperty('time');
        expect(slot).toHaveProperty('formatted');
      }
    });

    it('should return closed for Sunday', async () => {
      const sunday = getNextSunday();

      const response = await request(app)
        .get(`/api/bookings/availability/${sunday}`)
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.reason).toBe('Closed');
    });
  });

  describe('POST /api/bookings', () => {
    it('should create a new booking', async () => {
      const futureDate = getNextMonday();

      const bookingData = {
        email: 'test@example.com',
        phone: '555-123-4567',
        firstName: 'Test',
        lastName: 'User',
        serviceVariantId: testVariantId,
        vehicleYear: 2024,
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        appointmentDate: futureDate,
        appointmentTime: '10:00',
        notes: 'test booking',
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body).toHaveProperty('booking');
      expect(response.body).toHaveProperty('depositRequired');
      expect(response.body.booking.status).toBe('pending_deposit');
      expect(response.body.depositRequired).toBe(35);
    });

    it('should reject booking with invalid email', async () => {
      const futureDate = getNextMonday();

      const bookingData = {
        email: 'invalid-email',
        phone: '555-123-4567',
        firstName: 'Test',
        lastName: 'User',
        serviceVariantId: testVariantId,
        vehicleYear: 2024,
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        appointmentDate: futureDate,
        appointmentTime: '10:00',
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject booking with missing required fields', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .get('/api/bookings/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});

// Helper functions
function getNextMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split('T')[0];
}

function getNextSunday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  return nextSunday.toISOString().split('T')[0];
}
