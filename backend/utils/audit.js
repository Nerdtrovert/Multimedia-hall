const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const logsDir = path.resolve(__dirname, '..', 'logs');
const actionLogPath = path.join(logsDir, 'actions.log');

const ensureActionLogFile = () => {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  if (!fs.existsSync(actionLogPath)) {
    fs.writeFileSync(actionLogPath, '', 'utf8');
  }
};

const appendActionLog = (entry) => {
  try {
    ensureActionLogFile();
    const payload = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    fs.appendFileSync(actionLogPath, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (err) {
    console.error('Action log file write failed:', err.message);
  }
};

const logAudit = async (action, performedBy, targetBookingId, details) => {
  appendActionLog({
    action,
    performedBy: performedBy || null,
    targetBookingId: targetBookingId || null,
    details: details || null,
    source: 'audit',
  });

  try {
    await db.query(
      'INSERT INTO audit_logs (action, performed_by, target_booking_id, details) VALUES (?, ?, ?, ?)',
      [action, performedBy, targetBookingId, details]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAudit, appendActionLog, actionLogPath, ensureActionLogFile };
