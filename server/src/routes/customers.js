const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All customer routes require authentication
router.use(authenticateToken);

// GET /api/admin/customers - List customers with search and pagination
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        c.*,
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as total_spent,
        MAX(b.appointment_date) as last_visit
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id
      LEFT JOIN payments p ON b.id = p.booking_id
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE c.email ILIKE $${paramIndex}
                 OR c.first_name ILIKE $${paramIndex}
                 OR c.last_name ILIKE $${paramIndex}
                 OR c.phone ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM customers c';
    if (search) {
      countQuery += ` WHERE c.email ILIKE $1
                      OR c.first_name ILIKE $1
                      OR c.last_name ILIKE $1
                      OR c.phone ILIKE $1`;
    }
    const countResult = await pool.query(countQuery, search ? [`%${search}%`] : []);

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/admin/customers/search - Quick search by name, phone, plate
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }

    const result = await pool.query(`
      SELECT DISTINCT ON (c.id)
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        cv.license_plate,
        cv.year,
        cv.make,
        cv.model
      FROM customers c
      LEFT JOIN customer_vehicles cv ON c.id = cv.customer_id
      WHERE c.first_name ILIKE $1
        OR c.last_name ILIKE $1
        OR c.phone ILIKE $1
        OR c.email ILIKE $1
        OR cv.license_plate ILIKE $1
      ORDER BY c.id, c.created_at DESC
      LIMIT 10
    `, [`%${q}%`]);

    res.json({ results: result.rows });
  } catch (err) {
    console.error('Error searching customers:', err);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

// GET /api/admin/customers/:id - Full customer profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        c.*,
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as total_spent,
        MAX(b.appointment_date) as last_visit
      FROM customers c
      LEFT JOIN bookings b ON c.id = b.customer_id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// GET /api/admin/customers/:id/vehicles - Customer's vehicles
router.get('/:id/vehicles', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT cv.*,
        (SELECT COUNT(*) FROM bookings b WHERE b.vehicle_id = cv.id) as booking_count
      FROM customer_vehicles cv
      WHERE cv.customer_id = $1
      ORDER BY cv.created_at DESC
    `, [id]);

    res.json({ vehicles: result.rows });
  } catch (err) {
    console.error('Error fetching customer vehicles:', err);
    res.status(500).json({ error: 'Failed to fetch customer vehicles' });
  }
});

// POST /api/admin/customers/:id/vehicles - Add vehicle
router.post('/:id/vehicles',
  [
    body('year').optional().isInt({ min: 1900, max: 2100 }),
    body('make').notEmpty().trim(),
    body('model').notEmpty().trim(),
    body('color').optional().trim(),
    body('licensePlate').optional().trim(),
    body('vin').optional().trim().isLength({ max: 17 }),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { year, make, model, color, licensePlate, vin, notes } = req.body;

      // Verify customer exists
      const customerCheck = await pool.query(
        'SELECT id FROM customers WHERE id = $1',
        [id]
      );

      if (customerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const result = await pool.query(`
        INSERT INTO customer_vehicles
          (customer_id, year, make, model, color, license_plate, vin, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [id, year, make, model, color, licensePlate, vin, notes]);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error adding vehicle:', err);
      res.status(500).json({ error: 'Failed to add vehicle' });
    }
  }
);

// PUT /api/admin/customers/:id/vehicles/:vehicleId - Update vehicle
router.put('/:id/vehicles/:vehicleId',
  [
    body('year').optional().isInt({ min: 1900, max: 2100 }),
    body('make').optional().trim(),
    body('model').optional().trim(),
    body('color').optional().trim(),
    body('licensePlate').optional().trim(),
    body('vin').optional().trim().isLength({ max: 17 }),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    try {
      const { id, vehicleId } = req.params;
      const { year, make, model, color, licensePlate, vin, notes } = req.body;

      const result = await pool.query(`
        UPDATE customer_vehicles
        SET year = COALESCE($1, year),
            make = COALESCE($2, make),
            model = COALESCE($3, model),
            color = COALESCE($4, color),
            license_plate = COALESCE($5, license_plate),
            vin = COALESCE($6, vin),
            notes = COALESCE($7, notes)
        WHERE id = $8 AND customer_id = $9
        RETURNING *
      `, [year, make, model, color, licensePlate, vin, notes, vehicleId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating vehicle:', err);
      res.status(500).json({ error: 'Failed to update vehicle' });
    }
  }
);

// DELETE /api/admin/customers/:id/vehicles/:vehicleId - Delete vehicle
router.delete('/:id/vehicles/:vehicleId', async (req, res) => {
  try {
    const { id, vehicleId } = req.params;

    const result = await pool.query(
      'DELETE FROM customer_vehicles WHERE id = $1 AND customer_id = $2 RETURNING id',
      [vehicleId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// GET /api/admin/customers/:id/history - Visit history with services
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        b.id,
        b.appointment_date,
        b.appointment_time,
        b.status,
        b.vehicle_year,
        b.vehicle_make,
        b.vehicle_model,
        b.total_amount,
        b.notes,
        b.created_at,
        sv.name as variant_name,
        sv.price as variant_price,
        s.name as service_name,
        s.category as service_category,
        cv.license_plate,
        cv.color as vehicle_color,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as paid_amount
      FROM bookings b
      JOIN service_variants sv ON b.service_variant_id = sv.id
      JOIN services s ON sv.service_id = s.id
      LEFT JOIN customer_vehicles cv ON b.vehicle_id = cv.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.customer_id = $1
      GROUP BY b.id, sv.name, sv.price, s.name, s.category, cv.license_plate, cv.color
      ORDER BY b.appointment_date DESC, b.appointment_time DESC
    `, [id]);

    res.json({ history: result.rows });
  } catch (err) {
    console.error('Error fetching customer history:', err);
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

// GET /api/admin/customers/:id/notes - Get customer notes
router.get('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        cn.*,
        au.name as created_by_name
      FROM customer_notes cn
      LEFT JOIN admin_users au ON cn.created_by = au.id
      WHERE cn.customer_id = $1
      ORDER BY cn.created_at DESC
    `, [id]);

    res.json({ notes: result.rows });
  } catch (err) {
    console.error('Error fetching customer notes:', err);
    res.status(500).json({ error: 'Failed to fetch customer notes' });
  }
});

// POST /api/admin/customers/:id/notes - Add internal note
router.post('/:id/notes',
  [
    body('note').notEmpty().trim().isLength({ min: 1, max: 2000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { note } = req.body;
      const createdBy = req.user.id;

      // Verify customer exists
      const customerCheck = await pool.query(
        'SELECT id FROM customers WHERE id = $1',
        [id]
      );

      if (customerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const result = await pool.query(`
        INSERT INTO customer_notes (customer_id, note, created_by)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [id, note, createdBy]);

      // Get the created_by_name for response
      const noteWithUser = await pool.query(`
        SELECT
          cn.*,
          au.name as created_by_name
        FROM customer_notes cn
        LEFT JOIN admin_users au ON cn.created_by = au.id
        WHERE cn.id = $1
      `, [result.rows[0].id]);

      res.status(201).json(noteWithUser.rows[0]);
    } catch (err) {
      console.error('Error adding note:', err);
      res.status(500).json({ error: 'Failed to add note' });
    }
  }
);

// DELETE /api/admin/customers/:id/notes/:noteId - Delete note
router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    const { id, noteId } = req.params;

    const result = await pool.query(
      'DELETE FROM customer_notes WHERE id = $1 AND customer_id = $2 RETURNING id',
      [noteId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// PUT /api/admin/customers/:id - Update customer info
router.put('/:id',
  [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone } = req.body;

      const result = await pool.query(`
        UPDATE customers
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone)
        WHERE id = $5
        RETURNING *
      `, [firstName, lastName, email, phone, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating customer:', err);
      if (err.code === '23505') { // unique violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }
);

module.exports = router;
