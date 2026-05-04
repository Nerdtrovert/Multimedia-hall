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
const { ensureSupervisorAccount } = require('./services/supervisorAccount');
const { actionLogger } = require('./middleware/actionLogger');
const { initializeFirebaseAdmin } = require('./utils/firebaseUtils');
const { logError } = require('./utils/audit');
const db = require('./config/db');

const app = express();

const compression = require('compression');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
  initializeFirebaseAdmin();
  await ensurePushTokenTable();
  await ensureSupervisorAccount();
  await syncCollegeNames();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    startPostReportReminderScheduler();
  });
};

boot().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
