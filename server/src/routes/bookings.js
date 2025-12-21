const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const router = express.Router();

// Get available time slots for a date
router.get('/availability/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const serviceVariantId = req.query.serviceVariantId;

    // Get day of week (0-6)
    const dayOfWeek = new Date(date).getDay();

    // Check if date is blocked
    const blockedCheck = await pool.query(
      'SELECT * FROM blocked_dates WHERE blocked_date = $1',
      [date]
    );

    if (blockedCheck.rows.length > 0) {
      return res.json({ available: false, reason: blockedCheck.rows[0].reason, slots: [] });
    }

    // Get business hours for this day
    const hoursResult = await pool.query(
      'SELECT * FROM business_hours WHERE day_of_week = $1',
      [dayOfWeek]
    );

    if (hoursResult.rows.length === 0 || hoursResult.rows[0].is_closed) {
      return res.json({ available: false, reason: 'Closed', slots: [] });
    }

    const { open_time, close_time } = hoursResult.rows[0];

    // Get service duration if variant specified
    let duration = 60; // default 1 hour
    if (serviceVariantId) {
      const variantResult = await pool.query(
        `SELECT COALESCE(sv.duration_minutes, s.duration_minutes) as duration
         FROM service_variants sv
         JOIN services s ON sv.service_id = s.id
         WHERE sv.id = $1`,
        [serviceVariantId]
      );
      if (variantResult.rows.length > 0) {
        duration = variantResult.rows[0].duration;
      }
    }

    // Get existing bookings for this date
    const bookingsResult = await pool.query(
      `SELECT appointment_time,
              COALESCE(sv.duration_minutes, s.duration_minutes, 60) as duration
       FROM bookings b
       LEFT JOIN service_variants sv ON b.service_variant_id = sv.id
       LEFT JOIN services s ON sv.service_id = s.id
       WHERE appointment_date = $1 AND status != 'cancelled'`,
      [date]
    );

    // Generate available slots
    const slots = [];
    const openMinutes = timeToMinutes(open_time);
    const closeMinutes = timeToMinutes(close_time);
    const slotInterval = 30; // 30-minute intervals

    for (let time = openMinutes; time + duration <= closeMinutes; time += slotInterval) {
      const slotStart = time;
      const slotEnd = time + duration;

      // Check if slot conflicts with existing bookings
      const isAvailable = !bookingsResult.rows.some(booking => {
        const bookingStart = timeToMinutes(booking.appointment_time);
        const bookingEnd = bookingStart + booking.duration;
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      if (isAvailable) {
        slots.push({
          time: minutesToTime(time),
          formatted: formatTime(time)
        });
      }
    }

    res.json({ available: true, slots });
  } catch (err) {
    console.error('Error checking availability:', err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// Create a new booking
router.post('/',
  [
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty().trim(),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('serviceVariantId').isInt(),
    body('vehicleYear').isInt({ min: 1900, max: 2100 }),
    body('vehicleMake').notEmpty().trim(),
    body('vehicleModel').notEmpty().trim(),
    body('appointmentDate').isDate(),
    body('appointmentTime').matches(/^\d{2}:\d{2}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        email, phone, firstName, lastName,
        serviceVariantId, vehicleYear, vehicleMake, vehicleModel,
        appointmentDate, appointmentTime, notes
      } = req.body;

      // Get or create customer
      let customerResult = await client.query(
        'SELECT id FROM customers WHERE email = $1',
        [email]
      );

      let customerId;
      if (customerResult.rows.length === 0) {
        customerResult = await client.query(
          `INSERT INTO customers (email, phone, first_name, last_name)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [email, phone, firstName, lastName]
        );
        customerId = customerResult.rows[0].id;
      } else {
        customerId = customerResult.rows[0].id;
        // Update customer info
        await client.query(
          `UPDATE customers SET phone = $1, first_name = $2, last_name = $3 WHERE id = $4`,
          [phone, firstName, lastName, customerId]
        );
      }

      // Get service variant price
      const variantResult = await client.query(
        'SELECT price FROM service_variants WHERE id = $1',
        [serviceVariantId]
      );

      if (variantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid service variant' });
      }

      const totalAmount = variantResult.rows[0].price;
      const depositAmount = 35.00; // Fixed deposit amount

      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings
         (customer_id, service_variant_id, vehicle_year, vehicle_make, vehicle_model,
          appointment_date, appointment_time, notes, deposit_amount, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_deposit')
         RETURNING *`,
        [customerId, serviceVariantId, vehicleYear, vehicleMake, vehicleModel,
         appointmentDate, appointmentTime, notes, depositAmount, totalAmount]
      );

      await client.query('COMMIT');

      res.status(201).json({
        booking: bookingResult.rows[0],
        depositRequired: depositAmount
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating booking:', err);
      res.status(500).json({ error: 'Failed to create booking' });
    } finally {
      client.release();
    }
  }
);

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        b.*,
        c.email, c.phone, c.first_name, c.last_name,
        sv.name as variant_name, sv.price,
        s.name as service_name, s.category
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN service_variants sv ON b.service_variant_id = sv.id
      JOIN services s ON sv.service_id = s.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Cancel booking
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Helper functions
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

module.exports = router;
