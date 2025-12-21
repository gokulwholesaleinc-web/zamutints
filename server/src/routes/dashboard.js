const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// GET /api/admin/dashboard/today - Today's appointments with status
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT
        b.id,
        b.appointment_date,
        b.appointment_time,
        b.status,
        b.vehicle_year,
        b.vehicle_make,
        b.vehicle_model,
        b.notes,
        b.total_amount,
        b.deposit_amount,
        b.check_in_time,
        b.started_at,
        b.completed_at,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        sv.name as variant_name,
        sv.price,
        s.name as service_name,
        s.category,
        COALESCE(sv.duration_minutes, s.duration_minutes, 60) as duration_minutes,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as paid_amount
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN service_variants sv ON b.service_variant_id = sv.id
      JOIN services s ON sv.service_id = s.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.appointment_date = $1
        AND b.status != 'cancelled'
      GROUP BY b.id, c.first_name, c.last_name, c.email, c.phone,
               sv.name, sv.price, sv.duration_minutes, s.name, s.category, s.duration_minutes
      ORDER BY b.appointment_time ASC
    `, [today]);

    res.json({
      date: today,
      appointments: result.rows.map(row => ({
        ...row,
        paid_amount: parseFloat(row.paid_amount),
        total_amount: parseFloat(row.total_amount || 0),
        deposit_amount: parseFloat(row.deposit_amount || 0),
        price: parseFloat(row.price)
      }))
    });
  } catch (err) {
    console.error('Error fetching today appointments:', err);
    res.status(500).json({ error: 'Failed to fetch today appointments' });
  }
});

// GET /api/admin/dashboard/stats - Revenue stats (daily/weekly/monthly)
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Start of current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStartStr = startOfWeek.toISOString().split('T')[0];

    // Start of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = startOfMonth.toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT
        -- Today's revenue
        (SELECT COALESCE(SUM(amount), 0)
         FROM payments
         WHERE status = 'succeeded'
           AND DATE(created_at) = $1) as today_revenue,

        -- This week's revenue
        (SELECT COALESCE(SUM(amount), 0)
         FROM payments
         WHERE status = 'succeeded'
           AND DATE(created_at) >= $2) as week_revenue,

        -- This month's revenue
        (SELECT COALESCE(SUM(amount), 0)
         FROM payments
         WHERE status = 'succeeded'
           AND DATE(created_at) >= $3) as month_revenue,

        -- Today's completed jobs count
        (SELECT COUNT(*)
         FROM bookings
         WHERE appointment_date = $1
           AND status = 'completed') as today_completed,

        -- Today's total appointments
        (SELECT COUNT(*)
         FROM bookings
         WHERE appointment_date = $1
           AND status != 'cancelled') as today_total,

        -- In progress jobs
        (SELECT COUNT(*)
         FROM bookings
         WHERE appointment_date = $1
           AND status = 'in_progress') as in_progress,

        -- Checked in and waiting
        (SELECT COUNT(*)
         FROM bookings
         WHERE appointment_date = $1
           AND status = 'checked_in') as checked_in
    `, [todayStr, weekStartStr, monthStartStr]);

    const stats = result.rows[0];

    res.json({
      todayRevenue: parseFloat(stats.today_revenue),
      weekRevenue: parseFloat(stats.week_revenue),
      monthRevenue: parseFloat(stats.month_revenue),
      todayCompleted: parseInt(stats.today_completed),
      todayTotal: parseInt(stats.today_total),
      inProgress: parseInt(stats.in_progress),
      checkedIn: parseInt(stats.checked_in)
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/admin/dashboard/upcoming - Next 7 days overview
router.get('/upcoming', async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get daily appointment counts for next 7 days
    const dailyResult = await pool.query(`
      SELECT
        appointment_date::text as date,
        COUNT(*) as appointment_count,
        COALESCE(SUM(total_amount), 0) as expected_revenue
      FROM bookings
      WHERE appointment_date >= $1
        AND appointment_date < $2
        AND status NOT IN ('cancelled', 'no_show')
      GROUP BY appointment_date
      ORDER BY appointment_date ASC
    `, [todayStr, endDateStr]);

    // Get upcoming appointments with details (limited)
    const appointmentsResult = await pool.query(`
      SELECT
        b.id,
        b.appointment_date,
        b.appointment_time,
        b.status,
        b.vehicle_year,
        b.vehicle_make,
        b.vehicle_model,
        c.first_name,
        c.last_name,
        sv.name as variant_name,
        s.name as service_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN service_variants sv ON b.service_variant_id = sv.id
      JOIN services s ON sv.service_id = s.id
      WHERE b.appointment_date > $1
        AND b.appointment_date < $2
        AND b.status NOT IN ('cancelled', 'no_show')
      ORDER BY b.appointment_date ASC, b.appointment_time ASC
      LIMIT 10
    `, [todayStr, endDateStr]);

    res.json({
      dailySummary: dailyResult.rows.map(row => ({
        date: row.date,
        appointmentCount: parseInt(row.appointment_count),
        expectedRevenue: parseFloat(row.expected_revenue)
      })),
      upcomingAppointments: appointmentsResult.rows
    });
  } catch (err) {
    console.error('Error fetching upcoming appointments:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
  }
});

// PATCH /api/admin/dashboard/bookings/:id/status - Quick status update
router.patch('/bookings/:id/status',
  [body('status').isIn(['checked_in', 'in_progress', 'completed', 'no_show'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      // Build the update query based on status
      let updateFields = ['status = $1'];
      const params = [status, id];
      let paramIndex = 3;

      const now = new Date().toISOString();

      if (status === 'checked_in') {
        updateFields.push(`check_in_time = $${paramIndex++}`);
        params.splice(paramIndex - 2, 0, now);
      } else if (status === 'in_progress') {
        updateFields.push(`started_at = $${paramIndex++}`);
        params.splice(paramIndex - 2, 0, now);
      } else if (status === 'completed') {
        updateFields.push(`completed_at = $${paramIndex++}`);
        params.splice(paramIndex - 2, 0, now);
      }

      const query = `
        UPDATE bookings
        SET ${updateFields.join(', ')}
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, params);

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

module.exports = router;
