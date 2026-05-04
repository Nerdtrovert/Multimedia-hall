const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const logsDir = path.resolve(__dirname, '..', 'logs');
const actionLogPath = path.join(logsDir, 'actions.log');

const formatTimestamp = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const min = `${date.getMinutes()}`.padStart(2, '0');
  const ss = `${date.getSeconds()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} | ${hh}:${min}:${ss}`;
};

const ensureActionLogFile = () => {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  if (!fs.existsSync(actionLogPath)) {
    fs.writeFileSync(actionLogPath, '', 'utf8');
  }
};

const appendActionLog = (message) => {
  try {
    ensureActionLogFile();
    fs.appendFileSync(actionLogPath, `${formatTimestamp()} | ${message}\n`, 'utf8');
  } catch (err) {
    console.error('Action log file write failed:', err.message);
  }
};

const formatActorIdentity = (actor) => {
  const username = String(actor?.username || '').trim();
  const email = String(actor?.email || '').trim();

  if (username && email) return `${username} | ${email}`;
  if (email) return email;
  if (username) return username;
  return 'unknown user';
};

const appendAuditAction = (action, details) => {
  if (!details) return;

  if (action === 'BOOKING_CREATED') {
    appendActionLog(`REQUEST | ${details}`);
  } else if (action === 'BOOKING_STATUS_UPDATED') {
    appendActionLog(`ADMIN ACTION | ${details}`);
  }
};

const logError = (context, error) => {
  const errorMessage = error?.message || String(error || 'Unknown error');
  appendActionLog(`ERROR | ${context} | ${errorMessage}`);
  console.error(`${context}:`, error);
};

const logAudit = async (action, performedBy, targetBookingId, details) => {
  appendAuditAction(action, details);

  try {
    await db.query(
      'INSERT INTO audit_logs (action, performed_by, target_booking_id, details) VALUES (?, ?, ?, ?)',
      [action, performedBy, targetBookingId, details]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = {
  logAudit,
  appendActionLog,
  logError,
  actionLogPath,
  ensureActionLogFile,
  formatActorIdentity,
};
