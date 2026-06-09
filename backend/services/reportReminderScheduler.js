const cron = require('node-cron');
const db = require('../config/db');
const {
  hasMailConfig,
  isValidEmail,
  normalizeEmail,
  sendPostReportReminderEmail,
} = require('../utils/mailer');
const { sendPostReportReminderPush } = require('../utils/pushNotifications');
const { isPushConfigured } = require('../utils/firebaseUtils');

const ensureReminderTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS report_reminder_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      reminder_date DATE NOT NULL,
      recipient_email VARCHAR(150) NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_booking_reminder_date (booking_id, reminder_date),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);
};

const fetchPendingReminderBookings = async () => {
  const [rows] = await db.query(
    `SELECT
        b.id,
        b.title,
        b.college_name,
        b.event_date,
        b.start_time,
        b.end_time,
        u.id AS user_id,
        u.email AS user_email,
        u.name AS user_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      LEFT JOIN report_reminder_logs r
        ON r.booking_id = b.id
       AND r.reminder_date = CURDATE()
       WHERE b.status = 'approved'
         AND b.event_report_file_path IS NULL
         AND b.event_report_data IS NULL
         AND b.event_date < CURDATE()
         AND r.id IS NULL
      ORDER BY b.event_date ASC`
  );
  return rows;
};

const markReminderSent = async (bookingId, recipientEmail) => {
  await db.query(
    `INSERT INTO report_reminder_logs (booking_id, reminder_date, recipient_email)
     VALUES (?, CURDATE(), ?)`,
    [bookingId, recipientEmail]
  );
};

const runPostReportReminderJob = async () => {
  try {
    await ensureReminderTable();
    const pendingBookings = await fetchPendingReminderBookings();
    if (pendingBookings.length === 0) return;
    let deliveredCount = 0;

    for (const booking of pendingBookings) {
      const recipientEmail = normalizeEmail(booking.user_email);
      let delivered = false;

      if (hasMailConfig()) {
        if (!isValidEmail(recipientEmail)) {
          console.warn(`Skipping reminder email for booking ${booking.id}: invalid user email "${booking.user_email || ''}"`);
        } else {
          await sendPostReportReminderEmail(
            recipientEmail,
            booking.user_name || booking.college_name,
            booking,
            '/user/my-bookings'
          );
          delivered = true;
        }
      }

      if (isPushConfigured()) {
        try {
          const pushResult = await sendPostReportReminderPush(booking.user_id, booking);
          if ((pushResult?.sent || 0) > 0) {
            delivered = true;
          }
        } catch (pushErr) {
          console.error(`Reminder push failed for booking ${booking.id}:`, pushErr.message);
        }
      }

      if (delivered) {
        await markReminderSent(booking.id, recipientEmail || booking.user_email || 'push-only');
        deliveredCount += 1;
      }
    }

    console.log(`Post-report reminder job completed. Delivered: ${deliveredCount}/${pendingBookings.length}`);
  } catch (err) {
    console.error('Post-report reminder job failed:', err);
  }
};

const startPostReportReminderScheduler = () => {
  if (!hasMailConfig() && !isPushConfigured()) {
    console.warn('Post-report reminders disabled: missing mail and push configuration.');
    return null;
  }

  const cronExpression = process.env.POST_REPORT_REMINDER_CRON || '0 14 * * *';
  const cronTimezone = process.env.POST_REPORT_REMINDER_TZ || 'Asia/Kolkata';

  if (!cron.validate(cronExpression)) {
    console.warn(`Post-report reminders disabled: invalid cron "${cronExpression}".`);
    return null;
  }

  const task = cron.schedule(
    cronExpression,
    () => {
      runPostReportReminderJob();
    },
    { timezone: cronTimezone }
  );

  console.log(
    `Post-report reminder scheduler active (${cronExpression}, timezone ${cronTimezone}).`
  );

  if (process.env.POST_REPORT_REMINDER_RUN_ON_STARTUP === 'true') {
    runPostReportReminderJob();
  }

  return task;
};

module.exports = { startPostReportReminderScheduler };
