const db = require('../config/db');
const { getMessaging, isPushConfigured } = require('./firebaseUtils');
let pushConfigWarningShown = false;

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

  const messaging = getMessaging();
  const tokens = await getUserPushTokens(userId);
  if (!messaging) {
    return { sent: 0, reason: 'push_not_configured' };
  }

  if (tokens.length === 0) {
    return { sent: 0, reason: 'no_registered_tokens' };
  }

  const result = await messaging.sendEachForMulticast({
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

const sendPushToUsers = async (userIds, payload) => {
  const uniqueUserIds = [...new Set(userIds.map(Number).filter(Boolean))];
  const results = await Promise.allSettled(
    uniqueUserIds.map((userId) => sendPushToUser(userId, payload))
  );

  return results.reduce(
    (summary, result) => {
      if (result.status === 'fulfilled') {
        summary.sent += result.value?.sent || 0;
        summary.failed += result.value?.failed || 0;
        if (result.value?.reason) summary.reasons.push(result.value.reason);
      } else {
        summary.failed += 1;
        summary.reasons.push(result.reason?.message || String(result.reason));
      }
      return summary;
    },
    { sent: 0, failed: 0, reasons: [] }
  );
};

const sendNewBookingRequestPush = async (adminUserIds, booking) => {
  return sendPushToUsers(adminUserIds, {
    title: 'New booking request',
    body: `${booking.college_name} requested "${booking.title}" for ${new Date(
      booking.event_date
    ).toDateString()}.`,
    link: '/admin/requests',
    data: {
      type: 'new_booking_request',
      bookingId: booking.id,
    },
  });
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

const sendBookingCancellationAdminPush = async (adminUserIds, booking, requester, cancellationReason) => {
  return sendPushToUsers(adminUserIds, {
    title: 'Booking cancelled',
    body: `${requester.name || booking.college_name} cancelled "${booking.title}" scheduled for ${new Date(
      booking.event_date
    ).toDateString()}.`,
    link: '/admin/requests',
    data: {
      type: 'booking_cancelled',
      bookingId: booking.id,
      cancelledBy: requester.id || '',
      cancellationReason: cancellationReason || '',
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
  getUserPushTokens,
  sendPushToUser,
  sendPushToUsers,
  sendNewBookingRequestPush,
  sendBookingStatusPush,
  sendBookingCancellationAdminPush,
  sendPostReportReminderPush,
  sendPasswordResetPush,
};
