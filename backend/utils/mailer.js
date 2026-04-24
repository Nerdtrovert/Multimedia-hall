const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendStatusEmail = async (toEmail, userName, booking, status, adminNote) => {
  const isApproved = status === 'approved';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusLabel = isApproved ? 'APPROVED ✅' : 'REJECTED ❌';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a5f; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Auditorium Booking System</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your booking request has been reviewed:</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <h2 style="color: ${statusColor}; margin-top: 0;">${statusLabel}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b7280;">Event</td><td><strong>${booking.title}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td><strong>${new Date(booking.event_date).toDateString()}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Time</td><td><strong>${booking.start_time} – ${booking.end_time}</strong></td></tr>
            ${adminNote ? `<tr><td style="padding: 6px 0; color: #6b7280;">Note</td><td>${adminNote}</td></tr>` : ''}
          </table>
        </div>

        ${!isApproved ? '<p>You may submit a new request for a different time slot.</p>' : '<p>Please ensure the auditorium is left in good condition after your event.</p>'}
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated message. Do not reply.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: toEmail,
      subject: `Booking ${isApproved ? 'Approved' : 'Rejected'}: ${booking.title}`,
      html,
    });
    console.log(`Email sent to ${toEmail}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

const sendPostReportReminderEmail = async (toEmail, userName, booking, uploadPageUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a5f; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Auditorium Booking System</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
        <p>Dear <strong>${userName}</strong>,</p>
        <p>This is a reminder to upload the post-event report for your approved booking.</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b7280;">Event</td><td><strong>${booking.title}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">College</td><td><strong>${booking.college_name}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td><strong>${new Date(booking.event_date).toDateString()}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Time</td><td><strong>${booking.start_time} – ${booking.end_time}</strong></td></tr>
          </table>
        </div>

        <p>Please upload your report from the My Bookings page:</p>
        <p>
          <a href="${uploadPageUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #1e3a5f; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 6px; font-weight: 600;">
            Open My Bookings
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated reminder. Do not reply.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: toEmail,
      subject: `Reminder: Upload post-event report for ${booking.title}`,
      html,
    });
    console.log(`Reminder email sent to ${toEmail} for booking ${booking.id}`);
  } catch (err) {
    console.error('Reminder email send failed:', err.message);
    throw err;
  }
};

module.exports = { sendStatusEmail, sendPostReportReminderEmail };
