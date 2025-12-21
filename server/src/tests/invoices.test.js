const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db/pool');
const {
  generateInvoiceNumber,
  formatDate,
  formatTime,
  formatCurrency,
  BUSINESS_INFO
} = require('../services/invoiceService');

describe('Invoices API', () => {
  let testBookingId;
  let testCustomerId;
  let testVariantId;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get a service variant ID for testing
    const variantResult = await pool.query('SELECT id FROM service_variants LIMIT 1');
    testVariantId = variantResult.rows[0]?.id || 1;

    // Create a test customer
    const customerResult = await pool.query(
      `INSERT INTO customers (email, phone, first_name, last_name)
       VALUES ('invoice-test@example.com', '555-999-8888', 'Invoice', 'Tester')
       ON CONFLICT (email) DO UPDATE SET first_name = 'Invoice'
       RETURNING id`
    );
    testCustomerId = customerResult.rows[0].id;

    // Create a test booking
    const futureDate = getNextMonday();
    const bookingResult = await pool.query(
      `INSERT INTO bookings
       (customer_id, service_variant_id, vehicle_year, vehicle_make, vehicle_model,
        appointment_date, appointment_time, notes, deposit_amount, total_amount, status)
       VALUES ($1, $2, 2024, 'Honda', 'Civic', $3, '11:00', 'invoice test booking', 35.00, 240.00, 'confirmed')
       RETURNING id`,
      [testCustomerId, testVariantId, futureDate]
    );
    testBookingId = bookingResult.rows[0].id;

    // Create a test payment
    await pool.query(
      `INSERT INTO payments (booking_id, stripe_payment_intent_id, amount, status, payment_type)
       VALUES ($1, 'pi_test_invoice_123', 35.00, 'completed', 'deposit')`,
      [testBookingId]
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM payments WHERE stripe_payment_intent_id = 'pi_test_invoice_123'");
    await pool.query("DELETE FROM bookings WHERE notes = 'invoice test booking'");
    await pool.query("DELETE FROM customers WHERE email = 'invoice-test@example.com'");
    await pool.end();
  });

  describe('GET /api/invoices/:bookingId', () => {
    it('should generate a PDF invoice for a valid booking', async () => {
      const response = await request(app)
        .get(`/api/invoices/${testBookingId}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .get('/api/invoices/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Booking not found');
    });

    it('should return 400 for invalid booking ID', async () => {
      const response = await request(app)
        .get('/api/invoices/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for negative booking ID', async () => {
      const response = await request(app)
        .get('/api/invoices/-1')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/invoices/:bookingId/preview', () => {
    it('should return invoice preview data for a valid booking', async () => {
      const response = await request(app)
        .get(`/api/invoices/${testBookingId}/preview`)
        .expect(200);

      expect(response.body).toHaveProperty('booking');
      expect(response.body).toHaveProperty('invoiceNumber');
      expect(response.body.invoiceNumber).toMatch(/^INV-\d{6}-\d{6}$/);

      const booking = response.body.booking;
      expect(booking.first_name).toBe('Invoice');
      expect(booking.last_name).toBe('Tester');
      expect(booking.email).toBe('invoice-test@example.com');
      expect(booking.vehicle_make).toBe('Honda');
      expect(booking.vehicle_model).toBe('Civic');
      expect(parseFloat(booking.total_amount)).toBe(240.00);
    });

    it('should return 404 for non-existent booking preview', async () => {
      const response = await request(app)
        .get('/api/invoices/99999/preview')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Booking not found');
    });

    it('should return 400 for invalid booking ID in preview', async () => {
      const response = await request(app)
        .get('/api/invoices/abc/preview')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Invoice Service Helper Functions', () => {
    describe('generateInvoiceNumber', () => {
      it('should generate invoice number with correct format', () => {
        const invoiceNumber = generateInvoiceNumber(123);
        expect(invoiceNumber).toMatch(/^INV-\d{6}-000123$/);
      });

      it('should pad booking ID to 6 digits', () => {
        const invoiceNumber = generateInvoiceNumber(1);
        expect(invoiceNumber).toContain('000001');
      });

      it('should handle large booking IDs', () => {
        const invoiceNumber = generateInvoiceNumber(999999);
        expect(invoiceNumber).toContain('999999');
      });
    });

    describe('formatDate', () => {
      it('should format date correctly', () => {
        const formatted = formatDate('2024-03-15');
        expect(formatted).toBe('March 15, 2024');
      });

      it('should handle Date objects', () => {
        const formatted = formatDate(new Date('2024-12-25'));
        expect(formatted).toBe('December 25, 2024');
      });
    });

    describe('formatTime', () => {
      it('should format morning time correctly', () => {
        expect(formatTime('09:30')).toBe('9:30 AM');
      });

      it('should format afternoon time correctly', () => {
        expect(formatTime('14:00')).toBe('2:00 PM');
      });

      it('should format noon correctly', () => {
        expect(formatTime('12:00')).toBe('12:00 PM');
      });

      it('should format midnight correctly', () => {
        expect(formatTime('00:00')).toBe('12:00 AM');
      });
    });

    describe('formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(formatCurrency(100)).toBe('$100.00');
      });

      it('should handle decimal amounts', () => {
        expect(formatCurrency(99.99)).toBe('$99.99');
      });

      it('should handle large amounts with commas', () => {
        expect(formatCurrency(1000)).toBe('$1,000.00');
      });

      it('should handle zero', () => {
        expect(formatCurrency(0)).toBe('$0.00');
      });
    });

    describe('BUSINESS_INFO', () => {
      it('should have required business information', () => {
        expect(BUSINESS_INFO).toHaveProperty('name');
        expect(BUSINESS_INFO).toHaveProperty('address');
        expect(BUSINESS_INFO).toHaveProperty('city');
        expect(BUSINESS_INFO).toHaveProperty('phone');
        expect(BUSINESS_INFO).toHaveProperty('email');
        expect(BUSINESS_INFO).toHaveProperty('website');
        expect(BUSINESS_INFO.name).toBe('Zamu Tints');
      });
    });
  });
});

// Helper function
function getNextMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split('T')[0];
}
