/**
 * Notification Service for Zamu Tints
 * Handles SMS and Email notifications for booking-related events
 */

const { pool } = require('../db/pool');

// =============================================================================
// SMS Service (Twilio - Stubbed)
// =============================================================================

/**
 * Send SMS message via Twilio
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<object>} - Result with success status and message ID
 */
async function sendSMS(phone, message) {
  const twilioSid = process.env.TWILIO_SID;
  const twilioAuth = process.env.TWILIO_AUTH;
  const twilioPhone = process.env.TWILIO_PHONE;

  // Stub implementation - log and return mock response
  if (!twilioSid || !twilioAuth || !twilioPhone) {
    console.log('[SMS STUB] Would send SMS to:', phone);
    console.log('[SMS STUB] Message:', message);
    return {
      success: true,
      messageId: `stub_${Date.now()}`,
      stub: true,
      message: 'SMS sent (stub mode - Twilio not configured)'
    };
  }

  // Real Twilio implementation would go here
  // const twilio = require('twilio')(twilioSid, twilioAuth);
  // const result = await twilio.messages.create({
  //   body: message,
  //   from: twilioPhone,
  //   to: phone
  // });
  // return { success: true, messageId: result.sid };

  console.log('[SMS] Sending to:', phone);
  return {
    success: true,
    messageId: `stub_${Date.now()}`,
    stub: true
  };
}

// =============================================================================
// Email Service (Nodemailer - Stubbed)
// =============================================================================

/**
 * Send email via Nodemailer/SMTP
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of email
 * @returns {Promise<object>} - Result with success status and message ID
 */
async function sendEmail(to, subject, html) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@zamutints.com';

  // Stub implementation - log and return mock response
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('[EMAIL STUB] Would send email to:', to);
    console.log('[EMAIL STUB] Subject:', subject);
    console.log('[EMAIL STUB] Content preview:', html.substring(0, 200) + '...');
    return {
      success: true,
      messageId: `stub_email_${Date.now()}`,
      stub: true,
      message: 'Email sent (stub mode - SMTP not configured)'
    };
  }

  // Real Nodemailer implementation would go here
  // const nodemailer = require('nodemailer');
  // const transporter = nodemailer.createTransport({
  //   host: smtpHost,
  //   port: smtpPort || 587,
  //   secure: smtpPort === 465,
  //   auth: { user: smtpUser, pass: smtpPass }
  // });
  // const result = await transporter.sendMail({
  //   from: smtpFrom,
  //   to,
  //   subject,
  //   html
  // });
  // return { success: true, messageId: result.messageId };

  console.log('[EMAIL] Sending to:', to);
  return {
    success: true,
    messageId: `stub_email_${Date.now()}`,
    stub: true
  };
}

// =============================================================================
// Booking Notification Functions
// =============================================================================

/**
 * Get booking details with customer and service info
 * @param {number} bookingId - Booking ID
 * @returns {Promise<object|null>} - Booking details or null
 */
async function getBookingDetails(bookingId) {
  const result = await pool.query(`
    SELECT
      b.*,
      c.email, c.phone, c.first_name, c.last_name,
      sv.name as variant_name, sv.price,
      s.name as service_name, s.category,
      bs.business_name, bs.phone as business_phone
    FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    JOIN service_variants sv ON b.service_variant_id = sv.id
    JOIN services s ON sv.service_id = s.id
    CROSS JOIN business_settings bs
    WHERE b.id = $1
  `, [bookingId]);

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get template by name
 * @param {string} name - Template name
 * @returns {Promise<object|null>} - Template or null
 */
async function getTemplate(name) {
  const result = await pool.query(
    'SELECT * FROM notification_templates WHERE name = $1',
    [name]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Replace template variables with booking data
 * @param {string} content - Template content with {{variables}}
 * @param {object} booking - Booking data
 * @returns {string} - Processed content
 */
function processTemplate(content, booking) {
  const appointmentDate = new Date(booking.appointment_date + 'T12:00:00');
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const appointmentTime = booking.appointment_time;
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  const replacements = {
    '{{first_name}}': booking.first_name || '',
    '{{last_name}}': booking.last_name || '',
    '{{full_name}}': `${booking.first_name || ''} ${booking.last_name || ''}`.trim(),
    '{{service_name}}': booking.service_name || '',
    '{{variant_name}}': booking.variant_name || '',
    '{{vehicle}}': `${booking.vehicle_year} ${booking.vehicle_make} ${booking.vehicle_model}`,
    '{{appointment_date}}': formattedDate,
    '{{appointment_time}}': formattedTime,
    '{{total_amount}}': `$${parseFloat(booking.total_amount || 0).toFixed(2)}`,
    '{{deposit_amount}}': `$${parseFloat(booking.deposit_amount || 0).toFixed(2)}`,
    '{{business_name}}': booking.business_name || 'Zamu Tints',
    '{{business_phone}}': booking.business_phone || '872-203-1857',
    '{{booking_id}}': booking.id.toString()
  };

  let processed = content;
  for (const [key, value] of Object.entries(replacements)) {
    processed = processed.replace(new RegExp(key, 'g'), value);
  }
  return processed;
}

/**
 * Log notification to database
 * @param {object} data - Notification log data
 */
async function logNotification(data) {
  const { bookingId, customerId, type, recipient, message, status } = data;
  await pool.query(`
    INSERT INTO notification_log (booking_id, customer_id, type, recipient, message, status, sent_at)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
  `, [bookingId, customerId, type, recipient, message, status]);
}

/**
 * Send appointment confirmation after booking is created
 * @param {number} bookingId - Booking ID
 * @returns {Promise<object>} - Results of SMS and email sends
 */
async function sendConfirmation(bookingId) {
  const booking = await getBookingDetails(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const template = await getTemplate('appointment_confirmation');
  const results = { sms: null, email: null };

  // Send SMS
  if (booking.phone && template) {
    const smsContent = processTemplate(template.content, booking);
    results.sms = await sendSMS(booking.phone, smsContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'sms',
      recipient: booking.phone,
      message: smsContent,
      status: results.sms.success ? 'sent' : 'failed'
    });
  }

  // Send Email
  if (booking.email && template) {
    const emailSubject = processTemplate(template.subject || 'Booking Confirmation - {{business_name}}', booking);
    const emailContent = processTemplate(template.content, booking);
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B1B1B; padding: 20px; text-align: center;">
          <h1 style="color: #36B9EB; margin: 0;">Zamu Tints</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${emailContent.replace(/\n/g, '<br>')}
        </div>
        <div style="background: #1B1B1B; padding: 15px; text-align: center; color: #919191; font-size: 12px;">
          <p style="margin: 0;">Zamu Tints | Chicago, IL | 872-203-1857</p>
        </div>
      </div>
    `;
    results.email = await sendEmail(booking.email, emailSubject, htmlContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'email',
      recipient: booking.email,
      message: emailSubject,
      status: results.email.success ? 'sent' : 'failed'
    });
  }

  return results;
}

/**
 * Send appointment reminder (24 hours before)
 * @param {number} bookingId - Booking ID
 * @returns {Promise<object>} - Results of SMS and email sends
 */
async function sendAppointmentReminder(bookingId) {
  const booking = await getBookingDetails(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const template = await getTemplate('appointment_reminder');
  const results = { sms: null, email: null };

  // Send SMS
  if (booking.phone && template) {
    const smsContent = processTemplate(template.content, booking);
    results.sms = await sendSMS(booking.phone, smsContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'sms',
      recipient: booking.phone,
      message: smsContent,
      status: results.sms.success ? 'sent' : 'failed'
    });
  }

  // Send Email
  if (booking.email && template) {
    const emailSubject = processTemplate(template.subject || 'Appointment Reminder - {{business_name}}', booking);
    const emailContent = processTemplate(template.content, booking);
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B1B1B; padding: 20px; text-align: center;">
          <h1 style="color: #36B9EB; margin: 0;">Zamu Tints</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${emailContent.replace(/\n/g, '<br>')}
        </div>
        <div style="background: #1B1B1B; padding: 15px; text-align: center; color: #919191; font-size: 12px;">
          <p style="margin: 0;">Zamu Tints | Chicago, IL | 872-203-1857</p>
        </div>
      </div>
    `;
    results.email = await sendEmail(booking.email, emailSubject, htmlContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'email',
      recipient: booking.email,
      message: emailSubject,
      status: results.email.success ? 'sent' : 'failed'
    });
  }

  return results;
}

/**
 * Send review request after service is completed
 * @param {number} bookingId - Booking ID
 * @returns {Promise<object>} - Results of SMS and email sends
 */
async function sendReviewRequest(bookingId) {
  const booking = await getBookingDetails(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const template = await getTemplate('review_request');
  const results = { sms: null, email: null };

  // Send SMS
  if (booking.phone && template) {
    const smsContent = processTemplate(template.content, booking);
    results.sms = await sendSMS(booking.phone, smsContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'sms',
      recipient: booking.phone,
      message: smsContent,
      status: results.sms.success ? 'sent' : 'failed'
    });
  }

  // Send Email
  if (booking.email && template) {
    const emailSubject = processTemplate(template.subject || 'How was your experience? - {{business_name}}', booking);
    const emailContent = processTemplate(template.content, booking);
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B1B1B; padding: 20px; text-align: center;">
          <h1 style="color: #36B9EB; margin: 0;">Zamu Tints</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${emailContent.replace(/\n/g, '<br>')}
        </div>
        <div style="background: #1B1B1B; padding: 15px; text-align: center; color: #919191; font-size: 12px;">
          <p style="margin: 0;">Zamu Tints | Chicago, IL | 872-203-1857</p>
        </div>
      </div>
    `;
    results.email = await sendEmail(booking.email, emailSubject, htmlContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'email',
      recipient: booking.email,
      message: emailSubject,
      status: results.email.success ? 'sent' : 'failed'
    });
  }

  return results;
}

/**
 * Send service complete notification
 * @param {number} bookingId - Booking ID
 * @returns {Promise<object>} - Results of SMS and email sends
 */
async function sendServiceComplete(bookingId) {
  const booking = await getBookingDetails(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const template = await getTemplate('service_complete');
  const results = { sms: null, email: null };

  // Send SMS
  if (booking.phone && template) {
    const smsContent = processTemplate(template.content, booking);
    results.sms = await sendSMS(booking.phone, smsContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'sms',
      recipient: booking.phone,
      message: smsContent,
      status: results.sms.success ? 'sent' : 'failed'
    });
  }

  // Send Email
  if (booking.email && template) {
    const emailSubject = processTemplate(template.subject || 'Your Service is Complete! - {{business_name}}', booking);
    const emailContent = processTemplate(template.content, booking);
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B1B1B; padding: 20px; text-align: center;">
          <h1 style="color: #36B9EB; margin: 0;">Zamu Tints</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${emailContent.replace(/\n/g, '<br>')}
        </div>
        <div style="background: #1B1B1B; padding: 15px; text-align: center; color: #919191; font-size: 12px;">
          <p style="margin: 0;">Zamu Tints | Chicago, IL | 872-203-1857</p>
        </div>
      </div>
    `;
    results.email = await sendEmail(booking.email, emailSubject, htmlContent);
    await logNotification({
      bookingId,
      customerId: booking.customer_id,
      type: 'email',
      recipient: booking.email,
      message: emailSubject,
      status: results.email.success ? 'sent' : 'failed'
    });
  }

  return results;
}

module.exports = {
  sendSMS,
  sendEmail,
  sendConfirmation,
  sendAppointmentReminder,
  sendReviewRequest,
  sendServiceComplete,
  getBookingDetails,
  getTemplate,
  processTemplate,
  logNotification
};
