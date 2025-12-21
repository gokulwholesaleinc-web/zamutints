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

// Get business settings
router.get('/business-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM business_settings LIMIT 1');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business settings not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching business settings:', err);
    res.status(500).json({ error: 'Failed to fetch business settings' });
  }
});

// Update business settings (super_admin only)
router.put('/business-settings',
  requireRole('super_admin'),
  [
    body('businessName').optional().trim().isLength({ max: 255 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('addressLine1').optional().trim().isLength({ max: 255 }),
    body('addressLine2').optional().trim().isLength({ max: 255 }),
    body('city').optional().trim().isLength({ max: 100 }),
    body('state').optional().trim().isLength({ max: 50 }),
    body('zip').optional().trim().isLength({ max: 20 }),
    body('logoUrl').optional().trim().isLength({ max: 500 }),
    body('instagramUrl').optional().trim().isLength({ max: 255 }),
    body('tiktokUrl').optional().trim().isLength({ max: 255 }),
    body('depositAmount').optional().isFloat({ min: 0 }),
    body('cancellationPolicy').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        businessName,
        phone,
        email,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        logoUrl,
        instagramUrl,
        tiktokUrl,
        depositAmount,
        cancellationPolicy
      } = req.body;

      const result = await pool.query(`
        UPDATE business_settings SET
          business_name = COALESCE($1, business_name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          address_line1 = COALESCE($4, address_line1),
          address_line2 = COALESCE($5, address_line2),
          city = COALESCE($6, city),
          state = COALESCE($7, state),
          zip = COALESCE($8, zip),
          logo_url = COALESCE($9, logo_url),
          instagram_url = COALESCE($10, instagram_url),
          tiktok_url = COALESCE($11, tiktok_url),
          deposit_amount = COALESCE($12, deposit_amount),
          cancellation_policy = COALESCE($13, cancellation_policy),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM business_settings LIMIT 1)
        RETURNING *
      `, [
        businessName,
        phone,
        email,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        logoUrl,
        instagramUrl,
        tiktokUrl,
        depositAmount,
        cancellationPolicy
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Business settings not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating business settings:', err);
      res.status(500).json({ error: 'Failed to update business settings' });
    }
  }
);

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

// Sales summary report
router.get('/reports/sales', async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded') as total_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded' AND created_at >= $1) as month_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded' AND created_at >= $2) as week_revenue,
        (SELECT COUNT(*) FROM bookings WHERE status IN ('completed', 'paid')) as completed_bookings
    `, [startOfMonth.toISOString(), startOfWeek.toISOString()]);

    const stats = result.rows[0];

    // Calculate average order value
    const avgResult = await pool.query(`
      SELECT COALESCE(AVG(total_paid), 0) as avg_order_value
      FROM (
        SELECT b.id, SUM(p.amount) as total_paid
        FROM bookings b
        JOIN payments p ON b.id = p.booking_id
        WHERE p.status = 'succeeded' AND b.status IN ('completed', 'paid')
        GROUP BY b.id
      ) as booking_totals
    `);

    // Revenue by service category
    const categoryResult = await pool.query(`
      SELECT
        s.category,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT b.id) as booking_count
      FROM services s
      JOIN service_variants sv ON s.id = sv.service_id
      JOIN bookings b ON sv.id = b.service_variant_id
      JOIN payments p ON b.id = p.booking_id
      WHERE p.status = 'succeeded'
      GROUP BY s.category
      ORDER BY revenue DESC
    `);

    res.json({
      totalRevenue: parseFloat(stats.total_revenue),
      monthRevenue: parseFloat(stats.month_revenue),
      weekRevenue: parseFloat(stats.week_revenue),
      completedBookings: parseInt(stats.completed_bookings),
      averageOrderValue: parseFloat(avgResult.rows[0].avg_order_value),
      revenueByCategory: categoryResult.rows.map(row => ({
        category: row.category,
        revenue: parseFloat(row.revenue),
        bookingCount: parseInt(row.booking_count)
      }))
    });
  } catch (err) {
    console.error('Error fetching sales report:', err);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
});

// Daily sales breakdown
router.get('/reports/sales-by-date', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const result = await pool.query(`
      SELECT
        DATE(p.created_at) as date,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT b.id) as booking_count
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.status = 'succeeded'
        AND DATE(p.created_at) >= $1
        AND DATE(p.created_at) <= $2
      GROUP BY DATE(p.created_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    res.json(result.rows.map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      bookingCount: parseInt(row.booking_count)
    })));
  } catch (err) {
    console.error('Error fetching sales by date:', err);
    res.status(500).json({ error: 'Failed to fetch sales by date' });
  }
});

// Top services by popularity
router.get('/reports/top-services', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.name as service_name,
        COUNT(DISTINCT b.id) as booking_count,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM services s
      JOIN service_variants sv ON s.id = sv.service_id
      JOIN bookings b ON sv.id = b.service_variant_id
      LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'succeeded'
      GROUP BY s.id, s.name
      ORDER BY booking_count DESC, revenue DESC
      LIMIT 10
    `);

    res.json(result.rows.map(row => ({
      serviceName: row.service_name,
      bookingCount: parseInt(row.booking_count),
      revenue: parseFloat(row.revenue)
    })));
  } catch (err) {
    console.error('Error fetching top services:', err);
    res.status(500).json({ error: 'Failed to fetch top services' });
  }
});

// Top customers
router.get('/reports/top-customers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.first_name || ' ' || c.last_name as customer_name,
        c.email,
        COALESCE(SUM(p.amount), 0) as total_spent,
        COUNT(DISTINCT b.id) as booking_count
      FROM customers c
      JOIN bookings b ON c.id = b.customer_id
      LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'succeeded'
      GROUP BY c.id, c.first_name, c.last_name, c.email
      ORDER BY total_spent DESC, booking_count DESC
      LIMIT 10
    `);

    res.json(result.rows.map(row => ({
      customerName: row.customer_name,
      email: row.email,
      totalSpent: parseFloat(row.total_spent),
      bookingCount: parseInt(row.booking_count)
    })));
  } catch (err) {
    console.error('Error fetching top customers:', err);
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
});

module.exports = router;
