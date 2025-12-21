const express = require('express');
const { pool } = require('../db/pool');
const router = express.Router();

// Get public business info
router.get('/business-info', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        business_name,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        state,
        zip,
        logo_url,
        instagram_url,
        tiktok_url,
        deposit_amount
      FROM business_settings
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business info not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching business info:', err);
    res.status(500).json({ error: 'Failed to fetch business info' });
  }
});

// Get all active services with variants
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.description,
        s.category,
        s.base_price,
        s.duration_minutes,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sv.id,
              'name', sv.name,
              'price', sv.price,
              'duration_minutes', sv.duration_minutes,
              'description', sv.description
            )
          ) FILTER (WHERE sv.id IS NOT NULL),
          '[]'
        ) as variants
      FROM services s
      LEFT JOIN service_variants sv ON s.id = sv.service_id
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY s.category, s.name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get single service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        s.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sv.id,
              'name', sv.name,
              'price', sv.price,
              'duration_minutes', sv.duration_minutes,
              'description', sv.description
            )
          ) FILTER (WHERE sv.id IS NOT NULL),
          '[]'
        ) as variants
      FROM services s
      LEFT JOIN service_variants sv ON s.id = sv.service_id
      WHERE s.id = $1 AND s.is_active = true
      GROUP BY s.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching service:', err);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Get services by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await pool.query(`
      SELECT
        s.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sv.id,
              'name', sv.name,
              'price', sv.price,
              'duration_minutes', sv.duration_minutes,
              'description', sv.description
            )
          ) FILTER (WHERE sv.id IS NOT NULL),
          '[]'
        ) as variants
      FROM services s
      LEFT JOIN service_variants sv ON s.id = sv.service_id
      WHERE s.category = $1 AND s.is_active = true
      GROUP BY s.id
      ORDER BY s.name
    `, [category]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching services by category:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

module.exports = router;
