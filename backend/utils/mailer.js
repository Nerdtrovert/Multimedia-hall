const nodemailer = require('nodemailer');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { getPrimaryFrontendUrl, parseOriginList } = require('../config/env');

let transporter = null;
let transportVerified = false;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const isAbsoluteUrl = (value) => /^[a-z][a-z\d+\-.]*:\/\//i.test(String(value || '').trim());

const joinUrl = (baseUrl, route = '') => {
  const normalizedBase = trimTrailingSlash(baseUrl);
  if (!normalizedBase) return '';
  if (!route) return normalizedBase;
  return `${normalizedBase}${route.startsWith('/') ? route : `/${route}`}`;
};

const getMailUrl = (envValue, fallbackRoute) => {
  const overrideUrls = parseOriginList(envValue);
  if (overrideUrls.length > 0) {
    const overrideUrl = overrideUrls[0];
    if (isAbsoluteUrl(overrideUrl)) {
      return overrideUrl;
    }
    return joinUrl(getPrimaryFrontendUrl(), overrideUrl || fallbackRoute);
  }

  if (isAbsoluteUrl(fallbackRoute)) return String(fallbackRoute).trim();
  return joinUrl(getPrimaryFrontendUrl(), fallbackRoute);
};

const renderButton = (href, label) => {
  if (!href) return '';
  return `
    <p style="margin: 24px 0 0;">
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #1e3a5f; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 600;">
        ${label}
      </a>
    </p>
  `;
};

const hasMailConfig = () =>
  Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_PORT &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASS &&
      process.env.MAIL_FROM
  );

const getTransporter = () => {
  if (!hasMailConfig()) {
    throw new Error('Mail configuration is incomplete.');
  }

  if (transporter) return transporter;

  const port = Number.parseInt(process.env.MAIL_PORT, 10) || 587;
  const secure =
    process.env.MAIL_SECURE === 'true' ||
    process.env.MAIL_SECURE === '1' ||
    port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
};

const verifyTransportOnce = async () => {
  if (transportVerified) return;
  try {
    await getTransporter().verify();
    transportVerified = true;
  } catch (err) {
    console.warn('Mail transport verification failed (will still attempt to send):', err.message);
  }
};

const sendMailToRecipient = async ({ toEmail, subject, html }) => {
  const normalizedRecipient = normalizeEmail(toEmail);
  if (!isValidEmail(normalizedRecipient)) {
    throw new Error(`Invalid recipient email: ${toEmail || '(empty)'}`);
  }

  await verifyTransportOnce();
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: normalizedRecipient,
    subject,
    html,
  });

  return normalizedRecipient;
};

const emailSkeleton = (bodyContent, buttonHtml = '') => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333;">
    <div style="background: #1e3a5f; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Auditorium Booking System</h1>
    </div>
    <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
      ${bodyContent}
      ${buttonHtml}
      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated message. Do not reply.</p>
    </div>
  </div>
`;

const sendStatusEmail = async (toEmail, userName, booking, status, adminNote) => {
  const isApproved = status === 'approved';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusLabel = isApproved ? 'APPROVED ✅' : 'REJECTED ❌';

  const bodyContent = `
    <p>Dear <strong>${userName}</strong>,</p>
    <p>Your booking request has been reviewed:</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusColor};">
      <h2 style="color: ${statusColor}; margin-top: 0;">${statusLabel}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 100px;">Event</td><td><strong>${booking.title}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td><strong>${new Date(booking.event_date).toDateString()}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Time</td><td><strong>${booking.start_time} – ${booking.end_time}</strong></td></tr>
        ${adminNote ? `<tr><td style="padding: 6px 0; color: #6b7280;">Note</td><td>${adminNote}</td></tr>` : ''}
      </table>
    </div>

    ${isApproved 
      ? '<p>Please ensure the auditorium is left in good condition after your event.</p><p>After the event ends, upload your post-event report from the <strong>My Bookings</strong> page.</p>' 
      : '<p>You may submit a new request for a different time slot.</p>'}
  `;

  const buttonHtml = renderButton(getMailUrl(process.env.MAIL_DASHBOARD_URL, '/user/dashboard'), 'Open Dashboard');
  const html = emailSkeleton(bodyContent, buttonHtml);

  const recipient = await sendMailToRecipient({
    toEmail,
    subject: `Booking ${isApproved ? 'Approved' : 'Rejected'}: ${booking.title}`,
    html,
  });
  console.log(`Email sent to ${recipient}`);
};

const sendAdminBookingRequestEmail = async (toEmail, adminName, booking, requester) => {
  const bodyContent = `
    <p>Dear <strong>${adminName || 'NES Admin'}</strong>,</p>
    <p>A new auditorium booking request is waiting for review.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 120px;">Event</td><td><strong>${booking.title}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">College</td><td><strong>${booking.college_name}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Requested by</td><td><strong>${requester.name || booking.college_name}</strong> (${requester.email})</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td><strong>${new Date(booking.event_date).toDateString()}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Time</td><td><strong>${booking.start_time} – ${booking.end_time}</strong></td></tr>
        ${booking.purpose ? `<tr><td style="padding: 6px 0; color: #6b7280;">Purpose</td><td>${booking.purpose}</td></tr>` : ''}
      </table>
    </div>

    <p>Please open the admin requests page to approve or reject this request.</p>
  `;

  const buttonHtml = renderButton(
    getMailUrl(process.env.MAIL_ADMIN_URL, '/admin/requests'),
    'Open Admin Requests'
  );
  const html = emailSkeleton(bodyContent, buttonHtml);

  const recipient = await sendMailToRecipient({
    toEmail,
    subject: `New Booking Request: ${booking.title}`,
    html,
  });
  console.log(`Admin booking request email sent to ${recipient} for booking ${booking.id}`);
};

const sendPostReportReminderEmail = async (toEmail, userName, booking, uploadPageUrl) => {
  const bodyContent = `
    <p>Dear <strong>${userName}</strong>,</p>
    <p>This is a reminder to upload the post-event report for your approved booking.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 100px;">Event</td><td><strong>${booking.title}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">College</td><td><strong>${booking.college_name}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td><strong>${new Date(booking.event_date).toDateString()}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Time</td><td><strong>${booking.start_time} – ${booking.end_time}</strong></td></tr>
      </table>
    </div>

    <p>Please upload your report from the 'My Bookings' menu:</p>
  `;

  const buttonHtml = renderButton(
    getMailUrl(process.env.MAIL_BOOKINGS_URL, uploadPageUrl || '/user/my-bookings'),
    'Open My Bookings'
  );
  const html = emailSkeleton(bodyContent, buttonHtml);

  const recipient = await sendMailToRecipient({
    toEmail,
    subject: `Reminder: Upload post-event report for ${booking.title}`,
    html,
  });
  console.log(`Reminder email sent to ${recipient} for booking ${booking.id}`);
};

const sendPasswordResetEmail = async (toEmail, userName, temporaryPassword) => {
  const bodyContent = `
    <p>Dear <strong>${userName}</strong>,</p>
    <p>Your password has been reset. Use the temporary password below to sign in:</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
      <p style="margin: 0; color: #6b7280;">Temporary Password</p>
      <p style="margin: 8px 0 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${temporaryPassword}</p>
    </div>

    <p>After login, <strong>PLEASE change your password</strong> from the Change Password option in the menu.</p>
  `;

  const buttonHtml = renderButton(getMailUrl(process.env.MAIL_LOGIN_URL, '/login'), 'Go to Login');
  const html = emailSkeleton(bodyContent, buttonHtml);

  const recipient = await sendMailToRecipient({
    toEmail,
    subject: 'Temporary Password - Auditorium Booking System',
    html,
  });
  console.log(`Password reset email sent to ${recipient}`);
};

module.exports = {
  hasMailConfig,
  isValidEmail,
  normalizeEmail,
  getMailUrl,
  sendStatusEmail,
  sendAdminBookingRequestEmail,
  sendPostReportReminderEmail,
  sendPasswordResetEmail,
};
