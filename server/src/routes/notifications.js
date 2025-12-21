/**
 * Notification Routes for Zamu Tints Admin Panel
 * Handles SMS, Email, and template management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const {
  sendSMS,
  sendEmail,
  sendConfirmation,
  sendAppointmentReminder,
  sendReviewRequest,
  sendServiceComplete
} = require('../services/notifications');

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

// =============================================================================
// Manual SMS/Email Send
// =============================================================================

/**
 * POST /api/admin/notifications/send-sms
 * Send a manual SMS to a phone number
 */
router.post('/send-sms',
  [
    body('phone').notEmpty().trim().withMessage('Phone number is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phone, message, bookingId, customerId } = req.body;

      const result = await sendSMS(phone, message);

      // Log the notification
      await pool.query(`
        INSERT INTO notification_log (booking_id, customer_id, type, recipient, message, status, sent_at)
        VALUES ($1, $2, 'sms', $3, $4, $5, CURRENT_TIMESTAMP)
      `, [bookingId || null, customerId || null, phone, message, result.success ? 'sent' : 'failed']);

      res.json({
        success: result.success,
        messageId: result.messageId,
        stub: result.stub || false,
        message: result.stub ? 'SMS sent (stub mode - Twilio not configured)' : 'SMS sent successfully'
      });
    } catch (err) {
      console.error('Error sending SMS:', err);
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  }
);

/**
 * POST /api/admin/notifications/send-email
 * Send a manual email
 */
router.post('/send-email',
  [
    body('to').isEmail().withMessage('Valid email is required'),
    body('subject').notEmpty().trim().withMessage('Subject is required'),
    body('html').notEmpty().withMessage('Email content is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { to, subject, html, bookingId, customerId } = req.body;

      const result = await sendEmail(to, subject, html);

      // Log the notification
      await pool.query(`
        INSERT INTO notification_log (booking_id, customer_id, type, recipient, message, status, sent_at)
        VALUES ($1, $2, 'email', $3, $4, $5, CURRENT_TIMESTAMP)
      `, [bookingId || null, customerId || null, to, subject, result.success ? 'sent' : 'failed']);

      res.json({
        success: result.success,
        messageId: result.messageId,
        stub: result.stub || false,
        message: result.stub ? 'Email sent (stub mode - SMTP not configured)' : 'Email sent successfully'
      });
    } catch (err) {
      console.error('Error sending email:', err);
      res.status(500).json({ error: 'Failed to send email' });
    }
  }
);

// =============================================================================
// Booking Notifications
// =============================================================================

/**
 * POST /api/admin/notifications/send-confirmation/:bookingId
 * Send confirmation notification for a booking
 */
router.post('/send-confirmation/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await sendConfirmation(parseInt(bookingId));
    res.json({
      success: true,
      sms: result.sms,
      email: result.email
    });
  } catch (err) {
    console.error('Error sending confirmation:', err);
    res.status(500).json({ error: err.message || 'Failed to send confirmation' });
  }
});

/**
 * POST /api/admin/notifications/send-reminder/:bookingId
 * Send reminder notification for a booking
 */
router.post('/send-reminder/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await sendAppointmentReminder(parseInt(bookingId));
    res.json({
      success: true,
      sms: result.sms,
      email: result.email
    });
  } catch (err) {
    console.error('Error sending reminder:', err);
    res.status(500).json({ error: err.message || 'Failed to send reminder' });
  }
});

/**
 * POST /api/admin/notifications/send-complete/:bookingId
 * Send service complete notification for a booking
 */
router.post('/send-complete/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await sendServiceComplete(parseInt(bookingId));
    res.json({
      success: true,
      sms: result.sms,
      email: result.email
    });
  } catch (err) {
    console.error('Error sending service complete notification:', err);
    res.status(500).json({ error: err.message || 'Failed to send notification' });
  }
});

/**
 * POST /api/admin/notifications/send-review/:bookingId
 * Send review request for a booking
 */
router.post('/send-review/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await sendReviewRequest(parseInt(bookingId));
    res.json({
      success: true,
      sms: result.sms,
      email: result.email
    });
  } catch (err) {
    console.error('Error sending review request:', err);
    res.status(500).json({ error: err.message || 'Failed to send review request' });
  }
});

// =============================================================================
// Template Management
// =============================================================================

/**
 * GET /api/admin/notifications/templates
 * Get all notification templates
 */
router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notification_templates ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/admin/notifications/templates/:id
 * Get a single template by ID
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM notification_templates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * POST /api/admin/notifications/templates
 * Create a new template
 */
router.post('/templates',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('type').isIn(['sms', 'email', 'both']).withMessage('Type must be sms, email, or both'),
    body('content').notEmpty().withMessage('Content is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, type, subject, content } = req.body;

      const result = await pool.query(`
        INSERT INTO notification_templates (name, type, subject, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, type, subject || null, content]);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating template:', err);
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'A template with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to create template' });
    }
  }
);

/**
 * PUT /api/admin/notifications/templates/:id
 * Update an existing template
 */
router.put('/templates/:id',
  [
    body('type').optional().isIn(['sms', 'email', 'both']),
    body('content').optional().notEmpty()
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, subject, content } = req.body;

      const result = await pool.query(`
        UPDATE notification_templates
        SET name = COALESCE($1, name),
            type = COALESCE($2, type),
            subject = COALESCE($3, subject),
            content = COALESCE($4, content),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [name, type, subject, content, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating template:', err);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }
);

/**
 * DELETE /api/admin/notifications/templates/:id
 * Delete a template
 */
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM notification_templates WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// =============================================================================
// Notification Log
// =============================================================================

/**
 * GET /api/admin/notifications/log
 * Get notification history with pagination
 */
router.get('/log', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status, bookingId } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        nl.*,
        c.first_name, c.last_name, c.email as customer_email
      FROM notification_log nl
      LEFT JOIN customers c ON nl.customer_id = c.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`nl.type = $${paramIndex++}`);
      params.push(type);
    }

    if (status) {
      conditions.push(`nl.status = $${paramIndex++}`);
      params.push(status);
    }

    if (bookingId) {
      conditions.push(`nl.booking_id = $${paramIndex++}`);
      params.push(bookingId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY nl.sent_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM notification_log nl';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ').replace(/\$\d+/g, (match) => {
        const idx = parseInt(match.slice(1));
        return idx <= params.length - 2 ? match : '';
      });
    }
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Error fetching notification log:', err);
    res.status(500).json({ error: 'Failed to fetch notification log' });
  }
});

// =============================================================================
// Notification Settings
// =============================================================================

/**
 * GET /api/admin/notifications/settings
 * Get notification settings
 */
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notification_settings ORDER BY setting_key');

    // Convert to object for easier frontend use
    const settings = {};
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }

    res.json(settings);
  } catch (err) {
    console.error('Error fetching notification settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/admin/notifications/settings
 * Update notification settings
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        INSERT INTO notification_settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [key, String(value)]);
    }

    // Return updated settings
    const result = await pool.query('SELECT * FROM notification_settings ORDER BY setting_key');
    const updatedSettings = {};
    for (const row of result.rows) {
      updatedSettings[row.setting_key] = row.setting_value;
    }

    res.json(updatedSettings);
  } catch (err) {
    console.error('Error updating notification settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// =============================================================================
// Test Notification
// =============================================================================

/**
 * POST /api/admin/notifications/test
 * Send a test notification
 */
router.post('/test',
  [
    body('type').isIn(['sms', 'email']).withMessage('Type must be sms or email'),
    body('recipient').notEmpty().withMessage('Recipient is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { type, recipient } = req.body;

      if (type === 'sms') {
        const result = await sendSMS(recipient, 'This is a test message from Zamu Tints. If you received this, SMS notifications are working!');
        res.json({
          success: result.success,
          type: 'sms',
          recipient,
          stub: result.stub || false,
          message: result.stub ? 'Test SMS sent (stub mode)' : 'Test SMS sent successfully'
        });
      } else {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1B1B1B; padding: 20px; text-align: center;">
              <h1 style="color: #36B9EB; margin: 0;">Zamu Tints</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #1B1B1B;">Test Email</h2>
              <p>This is a test email from your Zamu Tints notification system.</p>
              <p>If you received this email, your email notifications are working correctly!</p>
            </div>
            <div style="background: #1B1B1B; padding: 15px; text-align: center; color: #919191; font-size: 12px;">
              <p style="margin: 0;">Zamu Tints | Chicago, IL | 872-203-1857</p>
            </div>
          </div>
        `;
        const result = await sendEmail(recipient, 'Test Email - Zamu Tints', htmlContent);
        res.json({
          success: result.success,
          type: 'email',
          recipient,
          stub: result.stub || false,
          message: result.stub ? 'Test email sent (stub mode)' : 'Test email sent successfully'
        });
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  }
);

module.exports = router;
