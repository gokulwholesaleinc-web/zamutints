const PDFDocument = require('pdfkit');
const { pool } = require('../db/pool');

// Business information
const BUSINESS_INFO = {
  name: 'Zamu Tints',
  address: '123 Auto Row Drive',
  city: 'Los Angeles, CA 90001',
  phone: '(555) 123-4567',
  email: 'info@zamutints.com',
  website: 'www.zamutints.com'
};

/**
 * Generates a unique invoice number based on booking ID and date
 * @param {number} bookingId
 * @returns {string} Invoice number
 */
function generateInvoiceNumber(bookingId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${String(bookingId).padStart(6, '0')}`;
}

/**
 * Formats a date object to a readable string
 * @param {Date} date
 * @returns {string} Formatted date
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats time string (HH:MM) to readable format
 * @param {string} timeStr
 * @returns {string} Formatted time
 */
function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Formats a number as currency
 * @param {number} amount
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Fetches booking data with all related information
 * @param {number} bookingId
 * @returns {Promise<Object|null>} Booking data or null if not found
 */
async function getBookingData(bookingId) {
  const result = await pool.query(`
    SELECT
      b.id,
      b.vehicle_year,
      b.vehicle_make,
      b.vehicle_model,
      b.appointment_date,
      b.appointment_time,
      b.status,
      b.notes,
      b.deposit_amount,
      b.total_amount,
      b.created_at,
      c.email,
      c.phone,
      c.first_name,
      c.last_name,
      sv.name as variant_name,
      sv.price,
      s.name as service_name,
      s.category
    FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    JOIN service_variants sv ON b.service_variant_id = sv.id
    JOIN services s ON sv.service_id = s.id
    WHERE b.id = $1
  `, [bookingId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Calculates payment totals for a booking
 * @param {number} bookingId
 * @returns {Promise<Object>} Payment totals
 */
async function getPaymentTotals(bookingId) {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_paid
    FROM payments
    WHERE booking_id = $1
  `, [bookingId]);

  return {
    totalPaid: parseFloat(result.rows[0].total_paid) || 0
  };
}

/**
 * Generates a PDF invoice for a booking
 * @param {number} bookingId
 * @returns {Promise<{buffer: Buffer, invoiceNumber: string}>} PDF buffer and invoice number
 */
async function generateInvoice(bookingId) {
  const booking = await getBookingData(bookingId);

  if (!booking) {
    throw new Error('Booking not found');
  }

  const paymentTotals = await getPaymentTotals(bookingId);
  const invoiceNumber = generateInvoiceNumber(bookingId);
  const invoiceDate = formatDate(new Date());

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve({ buffer: pdfBuffer, invoiceNumber });
      });
      doc.on('error', reject);

      // Header with business info
      drawHeader(doc, invoiceNumber, invoiceDate);

      // Customer info
      drawCustomerInfo(doc, booking);

      // Booking details
      drawBookingDetails(doc, booking);

      // Pricing breakdown
      drawPricingBreakdown(doc, booking, paymentTotals);

      // Footer
      drawFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draws the header section of the invoice
 */
function drawHeader(doc, invoiceNumber, invoiceDate) {
  // Business name (logo placeholder)
  doc.fontSize(24)
     .fillColor('#1a365d')
     .text(BUSINESS_INFO.name, 50, 50);

  doc.fontSize(10)
     .fillColor('#4a5568')
     .text(BUSINESS_INFO.address, 50, 80)
     .text(BUSINESS_INFO.city, 50, 95)
     .text(`Phone: ${BUSINESS_INFO.phone}`, 50, 110)
     .text(`Email: ${BUSINESS_INFO.email}`, 50, 125);

  // Invoice info on the right
  doc.fontSize(20)
     .fillColor('#1a365d')
     .text('INVOICE', 400, 50, { align: 'right' });

  doc.fontSize(10)
     .fillColor('#4a5568')
     .text(`Invoice #: ${invoiceNumber}`, 400, 80, { align: 'right' })
     .text(`Date: ${invoiceDate}`, 400, 95, { align: 'right' });

  // Divider line
  doc.moveTo(50, 155)
     .lineTo(560, 155)
     .strokeColor('#e2e8f0')
     .stroke();
}

/**
 * Draws the customer information section
 */
function drawCustomerInfo(doc, booking) {
  doc.fontSize(12)
     .fillColor('#1a365d')
     .text('Bill To:', 50, 175);

  doc.fontSize(10)
     .fillColor('#2d3748')
     .text(`${booking.first_name} ${booking.last_name}`, 50, 195)
     .text(booking.email, 50, 210)
     .text(booking.phone || 'N/A', 50, 225);
}

/**
 * Draws the booking details section
 */
function drawBookingDetails(doc, booking) {
  const startY = 265;

  doc.fontSize(12)
     .fillColor('#1a365d')
     .text('Booking Details', 50, startY);

  // Vehicle info
  const vehicleInfo = `${booking.vehicle_year} ${booking.vehicle_make} ${booking.vehicle_model}`;

  doc.fontSize(10)
     .fillColor('#4a5568')
     .text('Vehicle:', 50, startY + 20)
     .fillColor('#2d3748')
     .text(vehicleInfo, 120, startY + 20);

  // Appointment date and time
  const appointmentDate = formatDate(booking.appointment_date);
  const appointmentTime = formatTime(booking.appointment_time);

  doc.fillColor('#4a5568')
     .text('Date:', 50, startY + 40)
     .fillColor('#2d3748')
     .text(appointmentDate, 120, startY + 40);

  doc.fillColor('#4a5568')
     .text('Time:', 50, startY + 60)
     .fillColor('#2d3748')
     .text(appointmentTime, 120, startY + 60);

  // Status
  doc.fillColor('#4a5568')
     .text('Status:', 50, startY + 80)
     .fillColor('#2d3748')
     .text(booking.status.replace(/_/g, ' ').toUpperCase(), 120, startY + 80);
}

/**
 * Draws the pricing breakdown section
 */
function drawPricingBreakdown(doc, booking, paymentTotals) {
  const startY = 390;
  const tableWidth = 510;

  // Table header
  doc.rect(50, startY, tableWidth, 25)
     .fillColor('#1a365d')
     .fill();

  doc.fontSize(10)
     .fillColor('#ffffff')
     .text('Description', 60, startY + 8)
     .text('Amount', 470, startY + 8, { align: 'right' });

  // Service row
  const serviceDesc = `${booking.service_name} - ${booking.variant_name}`;
  const serviceY = startY + 30;

  doc.rect(50, serviceY, tableWidth, 30)
     .fillColor('#f7fafc')
     .fill();

  doc.fontSize(10)
     .fillColor('#2d3748')
     .text(serviceDesc, 60, serviceY + 10)
     .text(formatCurrency(booking.total_amount), 470, serviceY + 10, { align: 'right' });

  // Totals section
  const totalsY = serviceY + 50;

  // Subtotal
  doc.fillColor('#4a5568')
     .text('Subtotal:', 350, totalsY)
     .fillColor('#2d3748')
     .text(formatCurrency(booking.total_amount), 470, totalsY, { align: 'right' });

  // Deposit paid
  const depositPaid = paymentTotals.totalPaid;
  doc.fillColor('#4a5568')
     .text('Deposit Paid:', 350, totalsY + 20)
     .fillColor('#38a169')
     .text(`-${formatCurrency(depositPaid)}`, 470, totalsY + 20, { align: 'right' });

  // Balance due
  const balanceDue = Math.max(0, parseFloat(booking.total_amount) - depositPaid);

  doc.rect(340, totalsY + 40, 220, 25)
     .fillColor('#1a365d')
     .fill();

  doc.fontSize(11)
     .fillColor('#ffffff')
     .text('Balance Due:', 350, totalsY + 48)
     .text(formatCurrency(balanceDue), 470, totalsY + 48, { align: 'right' });
}

/**
 * Draws the footer section
 */
function drawFooter(doc) {
  const footerY = 700;

  doc.moveTo(50, footerY)
     .lineTo(560, footerY)
     .strokeColor('#e2e8f0')
     .stroke();

  doc.fontSize(9)
     .fillColor('#718096')
     .text('Thank you for choosing Zamu Tints!', 50, footerY + 15, { align: 'center' })
     .text(`${BUSINESS_INFO.website}`, 50, footerY + 30, { align: 'center' });

  doc.fontSize(8)
     .fillColor('#a0aec0')
     .text('This invoice was generated electronically and is valid without a signature.', 50, footerY + 50, { align: 'center' });
}

module.exports = {
  generateInvoice,
  getBookingData,
  generateInvoiceNumber,
  formatDate,
  formatTime,
  formatCurrency,
  BUSINESS_INFO
};
