const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All inventory routes require authentication
router.use(authenticateToken);

// GET /api/admin/inventory - List all inventory items
router.get('/', async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;

    let query = 'SELECT * FROM inventory_items';
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR supplier ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (lowStock === 'true') {
      conditions.push('quantity <= reorder_level');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY category, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/admin/inventory/low-stock - Items below reorder level
router.get('/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory_items
      WHERE quantity <= reorder_level
      ORDER BY (quantity / NULLIF(reorder_level, 0)) ASC, name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching low stock items:', err);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// GET /api/admin/inventory/categories/list - Get all categories
router.get('/categories/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as item_count
      FROM inventory_items
      GROUP BY category
      ORDER BY category
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/admin/inventory/usage-report - Usage analytics
router.get('/usage-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Usage by item
    const usageByItem = await pool.query(`
      SELECT
        i.id,
        i.name,
        i.category,
        i.unit,
        i.cost_per_unit,
        COALESCE(SUM(u.quantity_used), 0) as total_used,
        COALESCE(SUM(u.quantity_used * i.cost_per_unit), 0) as total_cost,
        COUNT(DISTINCT u.booking_id) as jobs_count
      FROM inventory_items i
      LEFT JOIN inventory_usage u ON i.id = u.item_id
        AND u.created_at >= $1 AND u.created_at <= $2::date + interval '1 day'
      GROUP BY i.id, i.name, i.category, i.unit, i.cost_per_unit
      ORDER BY total_used DESC
    `, [start, end]);

    // Usage by category
    const usageByCategory = await pool.query(`
      SELECT
        i.category,
        COALESCE(SUM(u.quantity_used), 0) as total_used,
        COALESCE(SUM(u.quantity_used * i.cost_per_unit), 0) as total_cost
      FROM inventory_items i
      LEFT JOIN inventory_usage u ON i.id = u.item_id
        AND u.created_at >= $1 AND u.created_at <= $2::date + interval '1 day'
      GROUP BY i.category
      ORDER BY total_cost DESC
    `, [start, end]);

    // Daily usage trend
    const dailyUsage = await pool.query(`
      SELECT
        DATE(u.created_at) as date,
        COALESCE(SUM(u.quantity_used * i.cost_per_unit), 0) as total_cost
      FROM inventory_usage u
      JOIN inventory_items i ON u.item_id = i.id
      WHERE u.created_at >= $1 AND u.created_at <= $2::date + interval '1 day'
      GROUP BY DATE(u.created_at)
      ORDER BY date
    `, [start, end]);

    // Summary stats
    const summary = await pool.query(`
      SELECT
        COALESCE(SUM(u.quantity_used * i.cost_per_unit), 0) as total_material_cost,
        COUNT(DISTINCT u.booking_id) as total_jobs,
        COUNT(DISTINCT u.item_id) as items_used
      FROM inventory_usage u
      JOIN inventory_items i ON u.item_id = i.id
      WHERE u.created_at >= $1 AND u.created_at <= $2::date + interval '1 day'
    `, [start, end]);

    res.json({
      dateRange: { start, end },
      summary: {
        totalMaterialCost: parseFloat(summary.rows[0].total_material_cost) || 0,
        totalJobs: parseInt(summary.rows[0].total_jobs) || 0,
        itemsUsed: parseInt(summary.rows[0].items_used) || 0
      },
      usageByItem: usageByItem.rows.map(row => ({
        ...row,
        total_used: parseFloat(row.total_used),
        total_cost: parseFloat(row.total_cost),
        cost_per_unit: parseFloat(row.cost_per_unit)
      })),
      usageByCategory: usageByCategory.rows.map(row => ({
        ...row,
        total_used: parseFloat(row.total_used),
        total_cost: parseFloat(row.total_cost)
      })),
      dailyUsage: dailyUsage.rows.map(row => ({
        date: row.date,
        totalCost: parseFloat(row.total_cost)
      }))
    });
  } catch (err) {
    console.error('Error fetching usage report:', err);
    res.status(500).json({ error: 'Failed to fetch usage report' });
  }
});

// GET /api/admin/inventory/:id - Get single item with usage history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const itemResult = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const usageResult = await pool.query(`
      SELECT
        u.*,
        b.vehicle_year,
        b.vehicle_make,
        b.vehicle_model,
        c.first_name,
        c.last_name
      FROM inventory_usage u
      LEFT JOIN bookings b ON u.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE u.item_id = $1
      ORDER BY u.created_at DESC
      LIMIT 50
    `, [id]);

    res.json({
      item: itemResult.rows[0],
      usageHistory: usageResult.rows
    });
  } catch (err) {
    console.error('Error fetching inventory item:', err);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// POST /api/admin/inventory - Add new item
router.post('/',
  [
    body('name').notEmpty().trim(),
    body('category').notEmpty().trim(),
    body('quantity').isFloat({ min: 0 }),
    body('unit').notEmpty().trim(),
    body('costPerUnit').isFloat({ min: 0 }),
    body('reorderLevel').isFloat({ min: 0 }),
    body('sku').optional().trim(),
    body('supplier').optional().trim(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, category, sku, quantity, unit, costPerUnit, reorderLevel, supplier, notes } = req.body;

      const result = await pool.query(`
        INSERT INTO inventory_items
          (name, category, sku, quantity, unit, cost_per_unit, reorder_level, supplier, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [name, category, sku || null, quantity, unit, costPerUnit, reorderLevel, supplier || null, notes || null]);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'inventory_items_sku_key') {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      console.error('Error creating inventory item:', err);
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  }
);

// PATCH /api/admin/inventory/:id - Update item
router.patch('/:id',
  [
    body('name').optional().notEmpty().trim(),
    body('category').optional().notEmpty().trim(),
    body('quantity').optional().isFloat({ min: 0 }),
    body('unit').optional().notEmpty().trim(),
    body('costPerUnit').optional().isFloat({ min: 0 }),
    body('reorderLevel').optional().isFloat({ min: 0 }),
    body('sku').optional().trim(),
    body('supplier').optional().trim(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { name, category, sku, quantity, unit, costPerUnit, reorderLevel, supplier, notes } = req.body;

      const result = await pool.query(`
        UPDATE inventory_items SET
          name = COALESCE($1, name),
          category = COALESCE($2, category),
          sku = COALESCE($3, sku),
          quantity = COALESCE($4, quantity),
          unit = COALESCE($5, unit),
          cost_per_unit = COALESCE($6, cost_per_unit),
          reorder_level = COALESCE($7, reorder_level),
          supplier = COALESCE($8, supplier),
          notes = COALESCE($9, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `, [name, category, sku, quantity, unit, costPerUnit, reorderLevel, supplier, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'inventory_items_sku_key') {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      console.error('Error updating inventory item:', err);
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  }
);

// PATCH /api/admin/inventory/:id/adjust - Quick quantity adjustment
router.patch('/:id/adjust',
  [
    body('adjustment').isFloat().notEmpty(),
    body('reason').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { adjustment, reason } = req.body;

      const result = await pool.query(`
        UPDATE inventory_items SET
          quantity = quantity + $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [adjustment, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Log adjustment as usage if negative (for tracking)
      if (adjustment < 0) {
        await pool.query(`
          INSERT INTO inventory_usage (item_id, quantity_used, notes)
          VALUES ($1, $2, $3)
        `, [id, Math.abs(adjustment), reason || 'Manual adjustment']);
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error adjusting inventory:', err);
      res.status(500).json({ error: 'Failed to adjust inventory' });
    }
  }
);

// DELETE /api/admin/inventory/:id - Remove item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM inventory_items WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// POST /api/admin/inventory/:id/usage - Log usage for a job
router.post('/:id/usage',
  [
    body('quantityUsed').isFloat({ min: 0.01 }),
    body('bookingId').optional().isInt(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { quantityUsed, bookingId, notes } = req.body;

      // Check if item exists and has enough quantity
      const itemResult = await client.query('SELECT * FROM inventory_items WHERE id = $1', [id]);

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found' });
      }

      const item = itemResult.rows[0];
      if (parseFloat(item.quantity) < quantityUsed) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Insufficient quantity',
          available: parseFloat(item.quantity),
          requested: quantityUsed
        });
      }

      // Deduct from inventory
      await client.query(`
        UPDATE inventory_items SET
          quantity = quantity - $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [quantityUsed, id]);

      // Log usage
      const usageResult = await client.query(`
        INSERT INTO inventory_usage (item_id, booking_id, quantity_used, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [id, bookingId || null, quantityUsed, notes || null]);

      await client.query('COMMIT');

      // Get updated item
      const updatedItem = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);

      res.status(201).json({
        usage: usageResult.rows[0],
        updatedItem: updatedItem.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error logging usage:', err);
      res.status(500).json({ error: 'Failed to log usage' });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
