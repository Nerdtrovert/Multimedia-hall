const cron = require('node-cron');
const db = require('../config/db');
const { sendPostReportReminderEmail } = require('../utils/mailer');
const { sendPostReportReminderPush } = require('../utils/pushNotifications');

const defaultFrontendUrl = 'http://localhost:3000';

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
         AND u.email IS NOT NULL
         AND u.email <> ''
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

    const uploadPageUrl = `${process.env.FRONTEND_URL || defaultFrontendUrl}/user/my-bookings`;

    for (const booking of pendingBookings) {
      await sendPostReportReminderEmail(
        booking.user_email,
        booking.user_name || booking.college_name,
        booking,
        uploadPageUrl
      );
      try {
        await sendPostReportReminderPush(booking.user_id, booking);
      } catch (pushErr) {
        console.error(`Reminder push failed for booking ${booking.id}:`, pushErr.message);
      }
      await markReminderSent(booking.id, booking.user_email);
    }

    console.log(`Post-report reminder job completed. Sent: ${pendingBookings.length}`);
  } catch (err) {
    console.error('Post-report reminder job failed:', err);
  }
};

const startPostReportReminderScheduler = () => {
  const hasMailConfig = Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASS &&
      process.env.MAIL_FROM
  );

  if (!hasMailConfig) {
    console.warn('Post-report reminders disabled: missing mail configuration.');
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
