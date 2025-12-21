const express = require('express');
const { param, validationResult } = require('express-validator');
const { generateInvoice, getBookingData } = require('../services/invoiceService');

const router = express.Router();

/**
 * GET /api/invoices/:bookingId
 * Generates and returns a PDF invoice for a booking
 */
router.get('/:bookingId',
  [
    param('bookingId').isInt({ min: 1 }).withMessage('Invalid booking ID')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { bookingId } = req.params;

      // Check if booking exists first
      const booking = await getBookingData(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Generate the PDF invoice
      const { buffer, invoiceNumber } = await generateInvoice(bookingId);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (err) {
      console.error('Error generating invoice:', err);
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  }
);

/**
 * GET /api/invoices/:bookingId/preview
 * Returns invoice data in JSON format for preview purposes
 */
router.get('/:bookingId/preview',
  [
    param('bookingId').isInt({ min: 1 }).withMessage('Invalid booking ID')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { bookingId } = req.params;
      const booking = await getBookingData(bookingId);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      res.json({
        booking,
        invoiceNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(bookingId).padStart(6, '0')}`
      });
    } catch (err) {
      console.error('Error fetching invoice preview:', err);
      res.status(500).json({ error: 'Failed to fetch invoice preview' });
    }
  }
);

module.exports = router;
