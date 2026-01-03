const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { pool, initDatabase } = require('./db/pool');
const { initLicense, shutdownLicense, getLicenseStatus } = require('./middleware/license');

// Routes
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');
const paymentsRoutes = require('./routes/payments');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const invoicesRoutes = require('./routes/invoices');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const financeRoutes = require('./routes/finance');
const customersRoutes = require('./routes/customers');
const inventoryRoutes = require('./routes/inventory');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind Replit's proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing - raw for Stripe webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// License status (for diagnostics)
app.get('/api/license-status', (req, res) => {
  const status = getLicenseStatus();
  res.json({
    licensed: status.valid,
    error: process.env.NODE_ENV === 'development' ? status.error : undefined
  });
});

// Note: License details endpoint is handled in admin routes (server/src/routes/admin.js)
// That endpoint also includes stored license key from database for complete info

// API Routes
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/finance', financeRoutes);
app.use('/api/admin/customers', customersRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin/notifications', notificationsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
async function start() {
  try {
    // Initialize license first
    try {
      await initLicense();
    } catch (err) {
      console.error('[License] Validation failed:', err.message);
      if (process.env.NODE_ENV !== 'development') {
        console.error('Server cannot start without a valid license');
        process.exit(1);
      }
    }

    await initDatabase();
    console.log('Database initialized');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await shutdownLicense();
      server.close(() => process.exit(0));
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      await shutdownLicense();
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Only start server when run directly (not during tests)
if (require.main === module) {
  start();
}

module.exports = { app, start, initDatabase };
