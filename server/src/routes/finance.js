const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All finance routes require authentication
router.use(authenticateToken);

// GET /api/admin/finance/revenue - Revenue reports with date filters
router.get('/revenue', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = "DATE_TRUNC('week', p.created_at)";
        break;
      case 'month':
        dateFormat = "DATE_TRUNC('month', p.created_at)";
        break;
      default:
        dateFormat = 'DATE(p.created_at)';
    }

    const result = await pool.query(`
      SELECT
        ${dateFormat} as period,
        SUM(p.amount) as total_revenue,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN p.payment_type = 'deposit' THEN p.amount ELSE 0 END) as deposit_revenue,
        SUM(CASE WHEN p.payment_type = 'final' OR p.payment_type = 'full' THEN p.amount ELSE 0 END) as service_revenue
      FROM payments p
      WHERE p.status = 'succeeded'
        AND DATE(p.created_at) >= $1
        AND DATE(p.created_at) <= $2
      GROUP BY ${dateFormat}
      ORDER BY period ASC
    `, [start, end]);

    // Get totals
    const totalsResult = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_transactions
      FROM payments
      WHERE status = 'succeeded'
        AND DATE(created_at) >= $1
        AND DATE(created_at) <= $2
    `, [start, end]);

    res.json({
      data: result.rows.map(row => ({
        period: row.period,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        transactionCount: parseInt(row.transaction_count) || 0,
        depositRevenue: parseFloat(row.deposit_revenue) || 0,
        serviceRevenue: parseFloat(row.service_revenue) || 0
      })),
      summary: {
        totalRevenue: parseFloat(totalsResult.rows[0].total_revenue) || 0,
        totalTransactions: parseInt(totalsResult.rows[0].total_transactions) || 0,
        startDate: start,
        endDate: end
      }
    });
  } catch (err) {
    console.error('Error fetching revenue report:', err);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
});

// GET /api/admin/finance/deposits - Deposit tracking (collected vs pending)
router.get('/deposits', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Get collected deposits
    const collectedResult = await pool.query(`
      SELECT
        COALESCE(SUM(p.amount), 0) as collected_deposits,
        COUNT(*) as collected_count
      FROM payments p
      WHERE p.payment_type = 'deposit'
        AND p.status = 'succeeded'
        AND DATE(p.created_at) >= $1
        AND DATE(p.created_at) <= $2
    `, [start, end]);

    // Get pending deposits (bookings with status pending_deposit)
    const pendingResult = await pool.query(`
      SELECT
        COALESCE(SUM(b.deposit_amount), 0) as pending_deposits,
        COUNT(*) as pending_count
      FROM bookings b
      WHERE b.status = 'pending_deposit'
        AND b.appointment_date >= $1
        AND b.appointment_date <= $2
    `, [start, end]);

    // Get deposit details by date
    const dailyResult = await pool.query(`
      SELECT
        DATE(p.created_at) as date,
        SUM(p.amount) as amount,
        COUNT(*) as count
      FROM payments p
      WHERE p.payment_type = 'deposit'
        AND p.status = 'succeeded'
        AND DATE(p.created_at) >= $1
        AND DATE(p.created_at) <= $2
      GROUP BY DATE(p.created_at)
      ORDER BY date ASC
    `, [start, end]);

    res.json({
      collected: {
        amount: parseFloat(collectedResult.rows[0].collected_deposits) || 0,
        count: parseInt(collectedResult.rows[0].collected_count) || 0
      },
      pending: {
        amount: parseFloat(pendingResult.rows[0].pending_deposits) || 0,
        count: parseInt(pendingResult.rows[0].pending_count) || 0
      },
      daily: dailyResult.rows.map(row => ({
        date: row.date,
        amount: parseFloat(row.amount) || 0,
        count: parseInt(row.count) || 0
      })),
      startDate: start,
      endDate: end
    });
  } catch (err) {
    console.error('Error fetching deposits report:', err);
    res.status(500).json({ error: 'Failed to fetch deposits report' });
  }
});

// POST /api/admin/finance/expenses - Log expenses
router.post('/expenses',
  [
    body('category').notEmpty().trim(),
    body('amount').isFloat({ min: 0.01 }),
    body('description').optional().trim(),
    body('date').optional().isDate()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { category, amount, description, date } = req.body;
      const expenseDate = date || new Date().toISOString().split('T')[0];

      const result = await pool.query(
        `INSERT INTO expenses (category, amount, description, date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [category, amount, description || '', expenseDate]
      );

      res.status(201).json({
        ...result.rows[0],
        amount: parseFloat(result.rows[0].amount)
      });
    } catch (err) {
      console.error('Error creating expense:', err);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }
);

// GET /api/admin/finance/expenses - Get expenses with filters
router.get('/expenses', async (req, res) => {
  try {
    const { startDate, endDate, category, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    let query = `
      SELECT * FROM expenses
      WHERE date >= $1 AND date <= $2
    `;
    const params = [start, end];
    let paramIndex = 3;

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    query += ` ORDER BY date DESC, created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get totals by category
    const totalsQuery = `
      SELECT
        category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses
      WHERE date >= $1 AND date <= $2
      GROUP BY category
      ORDER BY total DESC
    `;
    const totalsResult = await pool.query(totalsQuery, [start, end]);

    // Get grand total
    const grandTotalResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE date >= $1 AND date <= $2
    `, [start, end]);

    res.json({
      expenses: result.rows.map(row => ({
        ...row,
        amount: parseFloat(row.amount)
      })),
      byCategory: totalsResult.rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total),
        count: parseInt(row.count)
      })),
      grandTotal: parseFloat(grandTotalResult.rows[0].total) || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      startDate: start,
      endDate: end
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// DELETE /api/admin/finance/expenses/:id - Delete an expense
router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM expenses WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET /api/admin/finance/profit - Profit margins by service
router.get('/profit', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Get revenue by service
    const revenueResult = await pool.query(`
      SELECT
        s.id as service_id,
        s.name as service_name,
        s.category,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT b.id) as booking_count
      FROM services s
      LEFT JOIN service_variants sv ON s.id = sv.service_id
      LEFT JOIN bookings b ON sv.id = b.service_variant_id
        AND b.appointment_date >= $1
        AND b.appointment_date <= $2
        AND b.status IN ('completed', 'paid')
      LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'succeeded'
      GROUP BY s.id, s.name, s.category
      ORDER BY revenue DESC
    `, [start, end]);

    // Get total expenses for the period
    const expensesResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE date >= $1 AND date <= $2
    `, [start, end]);

    // Get total revenue
    const totalRevenueResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM payments
      WHERE status = 'succeeded'
        AND DATE(created_at) >= $1
        AND DATE(created_at) <= $2
    `, [start, end]);

    const totalRevenue = parseFloat(totalRevenueResult.rows[0].total_revenue) || 0;
    const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses) || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

    // Revenue by category
    const categoryResult = await pool.query(`
      SELECT
        s.category,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT b.id) as booking_count
      FROM services s
      LEFT JOIN service_variants sv ON s.id = sv.service_id
      LEFT JOIN bookings b ON sv.id = b.service_variant_id
        AND b.appointment_date >= $1
        AND b.appointment_date <= $2
        AND b.status IN ('completed', 'paid')
      LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'succeeded'
      GROUP BY s.category
      ORDER BY revenue DESC
    `, [start, end]);

    res.json({
      byService: revenueResult.rows.map(row => ({
        serviceId: row.service_id,
        serviceName: row.service_name,
        category: row.category,
        revenue: parseFloat(row.revenue) || 0,
        bookingCount: parseInt(row.booking_count) || 0
      })),
      byCategory: categoryResult.rows.map(row => ({
        category: row.category,
        revenue: parseFloat(row.revenue) || 0,
        bookingCount: parseInt(row.booking_count) || 0
      })),
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: parseFloat(profitMargin),
        startDate: start,
        endDate: end
      }
    });
  } catch (err) {
    console.error('Error fetching profit report:', err);
    res.status(500).json({ error: 'Failed to fetch profit report' });
  }
});

// POST /api/admin/finance/cash-drawer - End of day reconciliation
router.post('/cash-drawer',
  [
    body('date').isDate(),
    body('openingBalance').isFloat({ min: 0 }),
    body('cashIn').isFloat({ min: 0 }),
    body('cashOut').isFloat({ min: 0 }),
    body('closingBalance').isFloat({ min: 0 }),
    body('notes').optional().trim(),
    body('reconciled').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { date, openingBalance, cashIn, cashOut, closingBalance, notes, reconciled } = req.body;

      // Upsert - update if exists, insert if not
      const result = await pool.query(`
        INSERT INTO cash_drawer (date, opening_balance, cash_in, cash_out, closing_balance, notes, reconciled)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (date) DO UPDATE SET
          opening_balance = EXCLUDED.opening_balance,
          cash_in = EXCLUDED.cash_in,
          cash_out = EXCLUDED.cash_out,
          closing_balance = EXCLUDED.closing_balance,
          notes = EXCLUDED.notes,
          reconciled = EXCLUDED.reconciled
        RETURNING *
      `, [date, openingBalance, cashIn, cashOut, closingBalance, notes || '', reconciled || false]);

      res.status(201).json({
        ...result.rows[0],
        opening_balance: parseFloat(result.rows[0].opening_balance),
        cash_in: parseFloat(result.rows[0].cash_in),
        cash_out: parseFloat(result.rows[0].cash_out),
        closing_balance: parseFloat(result.rows[0].closing_balance)
      });
    } catch (err) {
      console.error('Error saving cash drawer:', err);
      res.status(500).json({ error: 'Failed to save cash drawer' });
    }
  }
);

// GET /api/admin/finance/cash-drawer/:date - Get drawer for date
router.get('/cash-drawer/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const result = await pool.query(
      'SELECT * FROM cash_drawer WHERE date = $1',
      [date]
    );

    if (result.rows.length === 0) {
      // Return empty drawer for the date
      return res.json({
        date,
        opening_balance: 0,
        cash_in: 0,
        cash_out: 0,
        closing_balance: 0,
        notes: '',
        reconciled: false,
        exists: false
      });
    }

    const row = result.rows[0];
    res.json({
      ...row,
      opening_balance: parseFloat(row.opening_balance),
      cash_in: parseFloat(row.cash_in),
      cash_out: parseFloat(row.cash_out),
      closing_balance: parseFloat(row.closing_balance),
      exists: true
    });
  } catch (err) {
    console.error('Error fetching cash drawer:', err);
    res.status(500).json({ error: 'Failed to fetch cash drawer' });
  }
});

// GET /api/admin/finance/cash-drawer - Get cash drawer history
router.get('/cash-drawer', async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT * FROM cash_drawer
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC
      LIMIT $3
    `, [start, end, parseInt(limit)]);

    res.json({
      drawers: result.rows.map(row => ({
        ...row,
        opening_balance: parseFloat(row.opening_balance),
        cash_in: parseFloat(row.cash_in),
        cash_out: parseFloat(row.cash_out),
        closing_balance: parseFloat(row.closing_balance)
      })),
      startDate: start,
      endDate: end
    });
  } catch (err) {
    console.error('Error fetching cash drawer history:', err);
    res.status(500).json({ error: 'Failed to fetch cash drawer history' });
  }
});

module.exports = router;
