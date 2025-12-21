const express = require('express');
const Stripe = require('stripe');
const { pool } = require('../db/pool');
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent for deposit
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Get booking details
    const bookingResult = await pool.query(
      `SELECT b.*, c.email, c.first_name, c.last_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== 'pending_deposit') {
      return res.status(400).json({ error: 'Deposit already paid or booking cancelled' });
    }

    const amount = Math.round(booking.deposit_amount * 100); // Convert to cents

    // Create or retrieve Stripe customer
    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({ email: booking.email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      stripeCustomer = await stripe.customers.create({
        email: booking.email,
        name: `${booking.first_name} ${booking.last_name}`,
        metadata: { customerId: booking.customer_id.toString() }
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: stripeCustomer.id,
      metadata: {
        bookingId: bookingId.toString(),
        paymentType: 'deposit'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment record
    await pool.query(
      `INSERT INTO payments (booking_id, stripe_payment_intent_id, amount, status, payment_type)
       VALUES ($1, $2, $3, 'pending', 'deposit')`,
      [bookingId, paymentIntent.id, booking.deposit_amount]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: booking.deposit_amount
    });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Create payment intent for full/remaining payment
router.post('/create-full-payment-intent', async (req, res) => {
  try {
    const { bookingId } = req.body;

    const bookingResult = await pool.query(
      `SELECT b.*, c.email, c.first_name, c.last_name,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as paid_amount
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.id = $1
       GROUP BY b.id, c.email, c.first_name, c.last_name`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    const remainingAmount = booking.total_amount - booking.paid_amount;

    if (remainingAmount <= 0) {
      return res.status(400).json({ error: 'Booking already fully paid' });
    }

    const amount = Math.round(remainingAmount * 100);

    // Get or create Stripe customer
    const existingCustomers = await stripe.customers.list({ email: booking.email, limit: 1 });
    const stripeCustomer = existingCustomers.data[0] || await stripe.customers.create({
      email: booking.email,
      name: `${booking.first_name} ${booking.last_name}`
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: stripeCustomer.id,
      metadata: {
        bookingId: bookingId.toString(),
        paymentType: 'full_payment'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await pool.query(
      `INSERT INTO payments (booking_id, stripe_payment_intent_id, amount, status, payment_type)
       VALUES ($1, $2, $3, 'pending', 'full_payment')`,
      [bookingId, paymentIntent.id, remainingAmount]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: remainingAmount,
      totalAmount: booking.total_amount,
      paidAmount: booking.paid_amount
    });
  } catch (err) {
    console.error('Error creating full payment intent:', err);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handlePaymentFailure(failedPayment);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

async function handlePaymentSuccess(paymentIntent) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update payment status
    await client.query(
      `UPDATE payments SET status = 'succeeded' WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    // Get booking ID from metadata
    const bookingId = paymentIntent.metadata.bookingId;
    const paymentType = paymentIntent.metadata.paymentType;

    if (paymentType === 'deposit') {
      // Update booking status to confirmed
      await client.query(
        `UPDATE bookings SET status = 'confirmed' WHERE id = $1`,
        [bookingId]
      );
    } else if (paymentType === 'full_payment') {
      // Check if fully paid
      const paidResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total_paid
         FROM payments
         WHERE booking_id = $1 AND status = 'succeeded'`,
        [bookingId]
      );

      const bookingResult = await client.query(
        'SELECT total_amount FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (paidResult.rows[0].total_paid >= bookingResult.rows[0].total_amount) {
        await client.query(
          `UPDATE bookings SET status = 'paid' WHERE id = $1`,
          [bookingId]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Payment succeeded for booking ${bookingId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error handling payment success:', err);
  } finally {
    client.release();
  }
}

async function handlePaymentFailure(paymentIntent) {
  try {
    await pool.query(
      `UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );
    console.log(`Payment failed for intent ${paymentIntent.id}`);
  } catch (err) {
    console.error('Error handling payment failure:', err);
  }
}

// Get payment status for a booking
router.get('/status/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await pool.query(
      `SELECT
        b.total_amount,
        b.deposit_amount,
        b.status as booking_status,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as paid_amount,
        json_agg(
          json_build_object(
            'id', p.id,
            'amount', p.amount,
            'status', p.status,
            'type', p.payment_type,
            'created_at', p.created_at
          )
        ) FILTER (WHERE p.id IS NOT NULL) as payments
       FROM bookings b
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.id = $1
       GROUP BY b.id`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const data = result.rows[0];
    res.json({
      totalAmount: data.total_amount,
      depositAmount: data.deposit_amount,
      paidAmount: data.paid_amount,
      remainingAmount: data.total_amount - data.paid_amount,
      bookingStatus: data.booking_status,
      payments: data.payments || []
    });
  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

module.exports = router;
