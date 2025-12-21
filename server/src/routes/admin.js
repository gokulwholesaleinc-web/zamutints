const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// All admin routes require authentication
router.use(authenticateToken);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM bookings WHERE appointment_date = $1) as today_appointments,
        (SELECT COUNT(*) FROM bookings WHERE appointment_date > $1 AND status IN ('confirmed', 'paid')) as upcoming_appointments,
        (SELECT COUNT(*) FROM bookings WHERE status = 'pending_deposit') as pending_deposits,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded' AND created_at >= $2) as week_revenue,
        (SELECT COUNT(*) FROM customers) as total_customers
    `, [today, weekAgo]);

    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all bookings with filters
router.get('/bookings', async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        b.*,
        c.email, c.phone, c.first_name, c.last_name,
        sv.name as variant_name, sv.price,
        s.name as service_name, s.category,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as paid_amount
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN service_variants sv ON b.service_variant_id = sv.id
      JOIN services s ON sv.service_id = s.id
      LEFT JOIN payments p ON b.id = p.booking_id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`b.status = $${paramIndex++}`);
      params.push(status);
    }

    if (startDate) {
      conditions.push(`b.appointment_date >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`b.appointment_date <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` GROUP BY b.id, c.email, c.phone, c.first_name, c.last_name,
               sv.name, sv.price, s.name, s.category`;
    query += ` ORDER BY b.appointment_date DESC, b.appointment_time DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM bookings b';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ').replace(/\$\d+/g, (match) => {
        const idx = parseInt(match.slice(1));
        return idx <= params.length - 2 ? match : '';
      });
    }
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      bookings: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Update booking status
router.patch('/bookings/:id/status',
  [body('status').isIn(['pending_deposit', 'confirmed', 'paid', 'completed', 'cancelled', 'no_show'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await pool.query(
        'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating booking status:', err);
      res.status(500).json({ error: 'Failed to update booking status' });
    }
  }
);

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        c.*,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as total_spent
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id
      LEFT JOIN payments p ON b.id = p.booking_id
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE c.email ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      customers: result.rows,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Manage services
router.get('/services', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*,
        json_agg(
          json_build_object(
            'id', sv.id,
            'name', sv.name,
            'price', sv.price,
            'duration_minutes', sv.duration_minutes
          )
        ) FILTER (WHERE sv.id IS NOT NULL) as variants
      FROM services s
      LEFT JOIN service_variants sv ON s.id = sv.service_id
      GROUP BY s.id
      ORDER BY s.category, s.name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create service
router.post('/services',
  requireRole('super_admin', 'admin'),
  [
    body('name').notEmpty().trim(),
    body('category').notEmpty(),
    body('basePrice').isFloat({ min: 0 }),
    body('durationMinutes').isInt({ min: 15 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, category, basePrice, durationMinutes } = req.body;

      const result = await pool.query(
        `INSERT INTO services (name, description, category, base_price, duration_minutes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, description, category, basePrice, durationMinutes]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating service:', err);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

// Manage blocked dates
router.get('/blocked-dates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM blocked_dates WHERE blocked_date >= CURRENT_DATE ORDER BY blocked_date'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching blocked dates:', err);
    res.status(500).json({ error: 'Failed to fetch blocked dates' });
  }
});

router.post('/blocked-dates',
  [
    body('blockedDate').isDate(),
    body('reason').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { blockedDate, reason } = req.body;

      const result = await pool.query(
        'INSERT INTO blocked_dates (blocked_date, reason) VALUES ($1, $2) RETURNING *',
        [blockedDate, reason]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error blocking date:', err);
      res.status(500).json({ error: 'Failed to block date' });
    }
  }
);

router.delete('/blocked-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM blocked_dates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error unblocking date:', err);
    res.status(500).json({ error: 'Failed to unblock date' });
  }
});

// Business hours
router.get('/business-hours', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM business_hours ORDER BY day_of_week');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching business hours:', err);
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

router.put('/business-hours/:dayOfWeek', async (req, res) => {
  try {
    const { dayOfWeek } = req.params;
    const { openTime, closeTime, isClosed } = req.body;

    const result = await pool.query(
      `UPDATE business_hours
       SET open_time = $1, close_time = $2, is_closed = $3
       WHERE day_of_week = $4 RETURNING *`,
      [isClosed ? null : openTime, isClosed ? null : closeTime, isClosed, dayOfWeek]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating business hours:', err);
    res.status(500).json({ error: 'Failed to update business hours' });
  }
});

// Revenue report
router.get('/reports/revenue', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await pool.query(`
      SELECT
        DATE(p.created_at) as date,
        SUM(p.amount) as total,
        COUNT(*) as transaction_count
      FROM payments p
      WHERE p.status = 'succeeded'
        AND p.created_at >= $1
        AND p.created_at <= $2
      GROUP BY DATE(p.created_at)
      ORDER BY date
    `, [startDate || '1970-01-01', endDate || '2100-01-01']);

    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total), 0);

    res.json({
      daily: result.rows,
      totalRevenue,
      transactionCount: result.rows.reduce((sum, row) => sum + parseInt(row.transaction_count), 0)
    });
  } catch (err) {
    console.error('Error fetching revenue report:', err);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
});

module.exports = router;
