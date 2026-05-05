const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const reportRoutes = require('./routes/reports');
const firebaseRoutes = require('./routes/firebase');
const { startPostReportReminderScheduler } = require('./services/reportReminderScheduler');
const { ensurePushTokenTable } = require('./utils/pushNotifications');
const { syncCollegeNames } = require('./services/collegeNameSync');
const { ensureAdminProfile } = require('./services/adminProfileSync');
const { ensureSupervisorAccount } = require('./services/supervisorAccount');
const { actionLogger } = require('./middleware/actionLogger');
const { initializeFirebaseAdmin } = require('./utils/firebaseUtils');
const { logError } = require('./utils/audit');
const { getFrontendOrigins, getMissingRequiredEnv } = require('./config/env');
const db = require('./config/db');

const app = express();
const frontendOrigins = getFrontendOrigins();

const compression = require('compression');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || frontendOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed.'));
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json());
app.use(actionLogger);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/firebase', firebaseRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return res.json({
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Health check failed: database unavailable', error);
    return res.status(503).json({
      status: 'degraded',
      database: 'down',
      message: 'Database unavailable.',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err?.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  if (err?.message && (err.message.includes('Poster must') || err.message.includes('Event report must'))) {
    return res.status(400).json({ message: err.message });
  }

  logError(`Unhandled server error on ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ message: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const boot = async () => {
  const missingRequiredEnv = getMissingRequiredEnv();
  if (missingRequiredEnv.length > 0) {
    throw new Error(`Missing required environment variables: ${missingRequiredEnv.join(', ')}`);
  }

  initializeFirebaseAdmin();
  await ensurePushTokenTable();
  await ensureSupervisorAccount();
  await syncCollegeNames();
  await ensureAdminProfile();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    startPostReportReminderScheduler();
  });
};

boot().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
