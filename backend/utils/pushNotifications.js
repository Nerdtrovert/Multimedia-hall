const admin = require('firebase-admin');
const db = require('../config/db');

let firebaseApp = null;
let pushConfigWarningShown = false;

const normalizePrivateKey = (value) =>
  value ? String(value).replace(/\\n/g, '\n') : '';

const firebaseCredentials = () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
});

const isPushConfigured = () => {
  const creds = firebaseCredentials();
  return Boolean(creds.projectId && creds.clientEmail && creds.privateKey);
};

const getFirebaseApp = () => {
  if (!isPushConfigured()) return null;
  if (firebaseApp) return firebaseApp;

  const creds = firebaseCredentials();
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
  return firebaseApp;
};

const ensurePushTokenTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_push_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(255) NOT NULL,
      user_agent VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_push_token (token),
      INDEX idx_push_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

const saveUserPushToken = async (userId, token, userAgent = null) => {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new Error('Push token is required.');
  }

  await ensurePushTokenTable();
  await db.query(
    `INSERT INTO user_push_tokens (user_id, token, user_agent)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       user_agent = VALUES(user_agent),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, normalizedToken, userAgent || null]
  );
};

const removeUserPushToken = async (userId, token) => {
  await ensurePushTokenTable();
  const normalizedToken = String(token || '').trim();
  if (normalizedToken) {
    await db.query('DELETE FROM user_push_tokens WHERE user_id = ? AND token = ?', [
      userId,
      normalizedToken,
    ]);
    return;
  }
  await db.query('DELETE FROM user_push_tokens WHERE user_id = ?', [userId]);
};

const getUserPushTokens = async (userId) => {
  await ensurePushTokenTable();
  const [rows] = await db.query('SELECT token FROM user_push_tokens WHERE user_id = ?', [userId]);
  return rows.map((row) => row.token).filter(Boolean);
};

const clearInvalidPushTokens = async (tokens) => {
  if (!tokens.length) return;
  await db.query(
    `DELETE FROM user_push_tokens WHERE token IN (${tokens.map(() => '?').join(',')})`,
    tokens
  );
};

const sendPushToUser = async (userId, payload) => {
  if (!isPushConfigured()) {
    if (!pushConfigWarningShown) {
      console.warn('Push notifications disabled: missing Firebase Admin configuration.');
      pushConfigWarningShown = true;
    }
    return { sent: 0, reason: 'push_not_configured' };
  }

  const app = getFirebaseApp();
  const tokens = await getUserPushTokens(userId);
  if (tokens.length === 0) {
    return { sent: 0, reason: 'no_registered_tokens' };
  }

  const result = await admin.messaging(app).sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: Object.entries({ ...(payload.data || {}), link: payload.link || '/' }).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {}),
    webpush: {
      notification: {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      },
      fcmOptions: {
        link: payload.link || '/',
      },
    },
  });

  const invalidTokens = [];
  result.responses.forEach((response, index) => {
    if (!response.success) {
      const code = response.error?.code || '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  await clearInvalidPushTokens(invalidTokens);
  return {
    sent: result.successCount,
    failed: result.failureCount,
  };
};

const sendBookingStatusPush = async (userId, booking, status) => {
  const statusLabel = status === 'approved' ? 'Approved' : 'Rejected';
  return sendPushToUser(userId, {
    title: `Booking ${statusLabel}`,
    body: `${booking.title} on ${new Date(booking.event_date).toDateString()} was ${statusLabel.toLowerCase()}.`,
    link: '/user/my-bookings',
    data: {
      type: 'booking_status',
      bookingId: booking.id,
      status,
    },
  });
};

const sendPostReportReminderPush = async (userId, booking) => {
  return sendPushToUser(userId, {
    title: 'Post-event report reminder',
    body: `Upload report for "${booking.title}" (${new Date(booking.event_date).toDateString()}).`,
    link: '/user/my-bookings',
    data: {
      type: 'post_report_reminder',
      bookingId: booking.id,
    },
  });
};

const sendPasswordResetPush = async (userId) => {
  return sendPushToUser(userId, {
    title: 'Password reset completed',
    body: 'Your temporary password email was sent. Please log in and change it.',
    link: '/login',
    data: {
      type: 'password_reset',
    },
  });
};

module.exports = {
  ensurePushTokenTable,
  saveUserPushToken,
  removeUserPushToken,
  sendBookingStatusPush,
  sendPostReportReminderPush,
  sendPasswordResetPush,
};
