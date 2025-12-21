const express = require('express');
const { pool } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Helper to parse date range params
function getDateRange(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];
  return { start, end };
}

// GET /api/admin/analytics/popular-services - Most booked services
router.get('/popular-services', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.startDate, req.query.endDate);

    const result = await pool.query(`
      SELECT
        s.name as service_name,
        s.category,
        COUNT(b.id) as booking_count,
        COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as revenue
      FROM services s
      JOIN service_variants sv ON s.id = sv.service_id
      JOIN bookings b ON sv.id = b.service_variant_id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.appointment_date >= $1 AND b.appointment_date <= $2
        AND b.status != 'cancelled'
      GROUP BY s.id, s.name, s.category
      ORDER BY booking_count DESC
      LIMIT 10
    `, [start, end]);

    const maxBookings = result.rows.length > 0 ? Math.max(...result.rows.map(r => parseInt(r.booking_count))) : 1;

    res.json({
      services: result.rows.map(row => ({
        serviceName: row.service_name,
        category: row.category,
        bookingCount: parseInt(row.booking_count),
        revenue: parseFloat(row.revenue),
        percentage: Math.round((parseInt(row.booking_count) / maxBookings) * 100)
      })),
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('Error fetching popular services:', err);
    res.status(500).json({ error: 'Failed to fetch popular services' });
  }
});

// GET /api/admin/analytics/peak-hours - Busiest hours/days
router.get('/peak-hours', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.startDate, req.query.endDate);

    // Get bookings by day of week and hour
    const result = await pool.query(`
      SELECT
        EXTRACT(DOW FROM appointment_date) as day_of_week,
        EXTRACT(HOUR FROM appointment_time::time) as hour,
        COUNT(*) as booking_count
      FROM bookings
      WHERE appointment_date >= $1 AND appointment_date <= $2
        AND status != 'cancelled'
      GROUP BY EXTRACT(DOW FROM appointment_date), EXTRACT(HOUR FROM appointment_time::time)
      ORDER BY day_of_week, hour
    `, [start, end]);

    // Build heatmap data structure (7 days x business hours)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // 8 AM to 5 PM

    const heatmapData = {};
    let maxCount = 0;

    // Initialize all slots
    days.forEach((day, dayIndex) => {
      heatmapData[dayIndex] = {};
      hours.forEach(hour => {
        heatmapData[dayIndex][hour] = 0;
      });
    });

    // Fill in actual data
    result.rows.forEach(row => {
      const dayIndex = parseInt(row.day_of_week);
      const hour = parseInt(row.hour);
      const count = parseInt(row.booking_count);
      if (heatmapData[dayIndex] && hours.includes(hour)) {
        heatmapData[dayIndex][hour] = count;
        if (count > maxCount) maxCount = count;
      }
    });

    // Convert to array format for frontend
    const heatmap = days.map((day, dayIndex) => ({
      day,
      dayIndex,
      hours: hours.map(hour => ({
        hour,
        count: heatmapData[dayIndex][hour],
        intensity: maxCount > 0 ? Math.round((heatmapData[dayIndex][hour] / maxCount) * 100) : 0
      }))
    }));

    // Find busiest day and hour
    let busiestDay = null;
    let busiestHour = null;

    if (result.rows.length > 0) {
      const dayTotals = {};
      const hourTotals = {};

      result.rows.forEach(row => {
        const day = parseInt(row.day_of_week);
        const hour = parseInt(row.hour);
        const count = parseInt(row.booking_count);

        dayTotals[day] = (dayTotals[day] || 0) + count;
        hourTotals[hour] = (hourTotals[hour] || 0) + count;
      });

      const busiestDayIndex = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
      const busiestHourEntry = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0];

      if (busiestDayIndex) busiestDay = days[parseInt(busiestDayIndex[0])];
      if (busiestHourEntry) {
        const h = parseInt(busiestHourEntry[0]);
        busiestHour = h > 12 ? `${h - 12} PM` : `${h} AM`;
      }
    }

    res.json({
      heatmap,
      hours,
      busiestDay,
      busiestHour,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('Error fetching peak hours:', err);
    res.status(500).json({ error: 'Failed to fetch peak hours' });
  }
});

// GET /api/admin/analytics/customer-retention - Repeat vs new customers
router.get('/customer-retention', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.startDate, req.query.endDate);

    // Get customers with their booking counts in the date range
    const result = await pool.query(`
      WITH customer_bookings AS (
        SELECT
          c.id,
          COUNT(b.id) as bookings_in_period,
          (
            SELECT COUNT(*)
            FROM bookings b2
            WHERE b2.customer_id = c.id
              AND b2.appointment_date < $1
              AND b2.status != 'cancelled'
          ) as prior_bookings
        FROM customers c
        JOIN bookings b ON c.id = b.customer_id
        WHERE b.appointment_date >= $1 AND b.appointment_date <= $2
          AND b.status != 'cancelled'
        GROUP BY c.id
      )
      SELECT
        SUM(CASE WHEN prior_bookings = 0 THEN 1 ELSE 0 END) as new_customers,
        SUM(CASE WHEN prior_bookings > 0 THEN 1 ELSE 0 END) as returning_customers,
        COUNT(*) as total_customers
      FROM customer_bookings
    `, [start, end]);

    const stats = result.rows[0];
    const newCustomers = parseInt(stats.new_customers) || 0;
    const returningCustomers = parseInt(stats.returning_customers) || 0;
    const totalCustomers = parseInt(stats.total_customers) || 0;

    // Calculate retention rate
    const retentionRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0;

    res.json({
      newCustomers,
      returningCustomers,
      totalCustomers,
      retentionRate,
      breakdown: [
        { label: 'New Customers', value: newCustomers, percentage: totalCustomers > 0 ? Math.round((newCustomers / totalCustomers) * 100) : 0 },
        { label: 'Returning Customers', value: returningCustomers, percentage: retentionRate }
      ],
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('Error fetching customer retention:', err);
    res.status(500).json({ error: 'Failed to fetch customer retention' });
  }
});

// GET /api/admin/analytics/revenue-trends - Monthly/weekly growth
router.get('/revenue-trends', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.startDate, req.query.endDate);
    const groupBy = req.query.groupBy || 'week'; // 'day', 'week', or 'month'

    let dateFormat;
    let labelFormat;

    switch (groupBy) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default: // week
        dateFormat = 'IYYY-IW';
    }

    const result = await pool.query(`
      SELECT
        TO_CHAR(p.created_at, $3) as period,
        MIN(DATE(p.created_at)) as period_start,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT b.id) as booking_count
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.status = 'succeeded'
        AND DATE(p.created_at) >= $1
        AND DATE(p.created_at) <= $2
      GROUP BY TO_CHAR(p.created_at, $3)
      ORDER BY period_start ASC
    `, [start, end, dateFormat]);

    // Calculate growth percentage
    const trends = result.rows.map((row, index) => {
      const revenue = parseFloat(row.revenue);
      let growth = 0;

      if (index > 0) {
        const prevRevenue = parseFloat(result.rows[index - 1].revenue);
        if (prevRevenue > 0) {
          growth = Math.round(((revenue - prevRevenue) / prevRevenue) * 100);
        }
      }

      return {
        period: row.period,
        periodStart: row.period_start,
        revenue,
        bookingCount: parseInt(row.booking_count),
        growth
      };
    });

    // Calculate totals
    const totalRevenue = trends.reduce((sum, t) => sum + t.revenue, 0);
    const totalBookings = trends.reduce((sum, t) => sum + t.bookingCount, 0);
    const avgRevenue = trends.length > 0 ? totalRevenue / trends.length : 0;

    res.json({
      trends,
      totalRevenue,
      totalBookings,
      avgRevenue,
      groupBy,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('Error fetching revenue trends:', err);
    res.status(500).json({ error: 'Failed to fetch revenue trends' });
  }
});

// GET /api/admin/analytics/conversion - Bookings vs completed
router.get('/conversion', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.startDate, req.query.endDate);

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'pending_deposit' THEN 1 ELSE 0 END) as pending_deposit,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
      FROM bookings
      WHERE appointment_date >= $1 AND appointment_date <= $2
    `, [start, end]);

    const stats = result.rows[0];
    const totalBookings = parseInt(stats.total_bookings) || 0;
    const completed = parseInt(stats.completed) || 0;
    const paid = parseInt(stats.paid) || 0;
    const confirmed = parseInt(stats.confirmed) || 0;
    const pendingDeposit = parseInt(stats.pending_deposit) || 0;
    const cancelled = parseInt(stats.cancelled) || 0;
    const noShow = parseInt(stats.no_show) || 0;

    // Calculate rates
    const successfulBookings = completed + paid;
    const conversionRate = totalBookings > 0 ? Math.round((successfulBookings / totalBookings) * 100) : 0;
    const cancellationRate = totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0;
    const noShowRate = totalBookings > 0 ? Math.round((noShow / totalBookings) * 100) : 0;

    res.json({
      totalBookings,
      breakdown: [
        { status: 'Completed', count: completed, percentage: totalBookings > 0 ? Math.round((completed / totalBookings) * 100) : 0 },
        { status: 'Paid', count: paid, percentage: totalBookings > 0 ? Math.round((paid / totalBookings) * 100) : 0 },
        { status: 'Confirmed', count: confirmed, percentage: totalBookings > 0 ? Math.round((confirmed / totalBookings) * 100) : 0 },
        { status: 'Pending Deposit', count: pendingDeposit, percentage: totalBookings > 0 ? Math.round((pendingDeposit / totalBookings) * 100) : 0 },
        { status: 'Cancelled', count: cancelled, percentage: totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0 },
        { status: 'No Show', count: noShow, percentage: totalBookings > 0 ? Math.round((noShow / totalBookings) * 100) : 0 }
      ],
      conversionRate,
      cancellationRate,
      noShowRate,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('Error fetching conversion stats:', err);
    res.status(500).json({ error: 'Failed to fetch conversion stats' });
  }
});

// GET /api/admin/analytics/overview - Combined stats for dashboard
router.get('/overview', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.startDate, req.query.endDate);

    // Run all queries in parallel
    const [
      bookingsResult,
      revenueResult,
      customersResult,
      avgTicketResult
    ] = await Promise.all([
      // Total bookings in period
      pool.query(`
        SELECT
          COUNT(*) as total_bookings,
          SUM(CASE WHEN status IN ('completed', 'paid') THEN 1 ELSE 0 END) as successful_bookings
        FROM bookings
        WHERE appointment_date >= $1 AND appointment_date <= $2
      `, [start, end]),

      // Total revenue in period
      pool.query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_revenue
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE p.status = 'succeeded'
          AND b.appointment_date >= $1
          AND b.appointment_date <= $2
      `, [start, end]),

      // Customer retention
      pool.query(`
        WITH period_customers AS (
          SELECT DISTINCT c.id,
            (SELECT COUNT(*) FROM bookings b2 WHERE b2.customer_id = c.id AND b2.appointment_date < $1 AND b2.status != 'cancelled') as prior_bookings
          FROM customers c
          JOIN bookings b ON c.id = b.customer_id
          WHERE b.appointment_date >= $1 AND b.appointment_date <= $2
            AND b.status != 'cancelled'
        )
        SELECT
          COUNT(*) as total_customers,
          SUM(CASE WHEN prior_bookings > 0 THEN 1 ELSE 0 END) as returning_customers
        FROM period_customers
      `, [start, end]),

      // Average ticket value
      pool.query(`
        SELECT COALESCE(AVG(b.total_amount), 0) as avg_ticket
        FROM bookings b
        WHERE b.appointment_date >= $1 AND b.appointment_date <= $2
          AND b.status IN ('completed', 'paid')
      `, [start, end])
    ]);

    const bookingStats = bookingsResult.rows[0];
    const totalBookings = parseInt(bookingStats.total_bookings) || 0;
    const successfulBookings = parseInt(bookingStats.successful_bookings) || 0;

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;

    const customerStats = customersResult.rows[0];
    const totalCustomers = parseInt(customerStats.total_customers) || 0;
    const returningCustomers = parseInt(customerStats.returning_customers) || 0;
    const retentionRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0;

    const avgTicket = parseFloat(avgTicketResult.rows[0].avg_ticket) || 0;

    res.json({
      totalBookings,
      successfulBookings,
      totalRevenue,
      avgTicket,
      totalCustomers,
      returningCustomers,
      retentionRate,
      conversionRate: totalBookings > 0 ? Math.round((successfulBookings / totalBookings) * 100) : 0,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('Error fetching overview stats:', err);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

module.exports = router;
