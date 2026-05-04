const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { normalizeEmail, isValidEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { appendActionLog, logError, formatActorIdentity } = require('../utils/audit');
const {
  saveUserPushToken,
  removeUserPushToken,
  sendPasswordResetPush,
} = require('../utils/pushNotifications');

const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (rows.length === 0) {
      req.auditAction = 'LOGIN_FAILED';
      req.auditActor = { email: normalizedEmail, role: 'anonymous' };
      req.auditDetails = 'Login failed: user not found';
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];
    if (user.role === 'supervisor') {
      req.auditAction = 'LOGIN_REJECTED_SUPERVISOR_ROUTE';
      req.auditActor = { id: user.id, email: user.email, role: user.role };
      req.auditDetails = 'Supervisor attempted standard login route';
      return res.status(403).json({ message: 'Use the maintenance access route.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.auditAction = 'LOGIN_FAILED';
      req.auditActor = { id: user.id, email: user.email, role: user.role };
      req.auditDetails = 'Login failed: invalid password';
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      college_name: user.college_name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    req.auditAction = 'LOGIN_SUCCESS';
    req.auditActor = payload;
    req.auditDetails = 'User login success';

    res.json({
      token,
      user: payload,
    });
  } catch (err) {
    req.auditAction = 'LOGIN_ERROR';
    req.auditActor = { email: normalizedEmail, role: 'anonymous' };
    req.auditDetails = 'Login request failed';
    logError('Login error', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const supervisorLogin = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (rows.length === 0) {
      req.auditAction = 'SUPERVISOR_LOGIN_FAILED';
      req.auditActor = { email: normalizedEmail, role: 'anonymous' };
      req.auditDetails = 'Supervisor login failed: user not found';
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];
    if (user.role !== 'supervisor') {
      req.auditAction = 'SUPERVISOR_LOGIN_DENIED';
      req.auditActor = { id: user.id, email: user.email, role: user.role };
      req.auditDetails = 'Non-supervisor attempted maintenance login';
      return res.status(403).json({ message: 'Maintenance access denied.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.auditAction = 'SUPERVISOR_LOGIN_FAILED';
      req.auditActor = { id: user.id, email: user.email, role: user.role };
      req.auditDetails = 'Supervisor login failed: invalid password';
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      college_name: user.college_name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    req.auditAction = 'SUPERVISOR_LOGIN_SUCCESS';
    req.auditActor = payload;
    req.auditDetails = 'Supervisor login success';

    return res.json({
      token,
      user: payload,
    });
  } catch (err) {
    req.auditAction = 'SUPERVISOR_LOGIN_ERROR';
    req.auditActor = { email: normalizedEmail, role: 'anonymous' };
    req.auditDetails = 'Supervisor login request failed';
    logError('Supervisor login error', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, name, email, role, college_name, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    logError('Get current user error', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const generateTemporaryPassword = () => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(12);
  let password = '';

  for (let i = 0; i < 12; i += 1) {
    password += charset[bytes[i] % charset.length];
  }

  return password;
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const [rows] = await db.query('SELECT id, name, email, password FROM users WHERE email = ?', [normalizedEmail]);

    if (rows.length === 0) {
      return res.json({ message: 'If the email exists, a temporary password has been sent.' });
    }

    const user = rows[0];
    const recipientEmail = normalizeEmail(user.email);
    if (!isValidEmail(recipientEmail)) {
      console.warn(`Password reset skipped: invalid email for user ${user.id}`);
      return res.status(400).json({ message: 'No valid email is registered for this account.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await db.query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, user.id]);

    try {
      await sendPasswordResetEmail(recipientEmail, user.name, temporaryPassword);
    } catch (mailErr) {
      await db.query('UPDATE users SET password = ? WHERE id = ?', [user.password, user.id]);
      throw mailErr;
    }

    try {
      await sendPasswordResetPush(user.id);
    } catch (pushErr) {
      console.error('Password reset push failed:', pushErr.message);
    }

    return res.json({ message: 'If the email exists, a temporary password has been sent.' });
  } catch (err) {
    logError('Forgot password error', err);
    return res.status(500).json({ message: 'Unable to process password reset right now.' });
  }
};

const registerPushToken = async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) {
    return res.status(400).json({ message: 'Push token is required.' });
  }

  try {
    await saveUserPushToken(req.user.id, token, req.headers['user-agent'] || null);
    return res.json({ message: 'Push token registered.' });
  } catch (err) {
    logError('Register push token error', err);
    return res.status(500).json({ message: 'Failed to register push token.' });
  }
};

const unregisterPushToken = async (req, res) => {
  const token = String(req.body?.token || '').trim();
  try {
    await removeUserPushToken(req.user.id, token || null);
    return res.json({ message: 'Push token removed.' });
  } catch (err) {
    logError('Unregister push token error', err);
    return res.status(500).json({ message: 'Failed to unregister push token.' });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
  }

  try {
    const [rows] = await db.query('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect.' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from old password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, req.user.id]);

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    logError('Change password error', err);
    return res.status(500).json({ message: 'Unable to change password right now.' });
  }
};

const supervisorResetUserEmail = async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const updatedEmail = normalizeEmail(req.body?.email);

  if (!username || !updatedEmail) {
    return res.status(400).json({ message: 'Username and new email are required.' });
  }

  if (!isValidEmail(updatedEmail)) {
    return res.status(400).json({ message: 'Enter a valid new email address.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, name, username, email, password, role FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found for the provided username.' });
    }

    const targetUser = rows[0];

    if (targetUser.role !== 'college') {
      return res.status(403).json({ message: 'Only college account emails can be changed from this screen.' });
    }

    if (normalizeEmail(targetUser.email) === updatedEmail) {
      return res.status(400).json({ message: 'New email must be different from the current email.' });
    }

    const [emailRows] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [updatedEmail, targetUser.id]
    );

    if (emailRows.length > 0) {
      return res.status(409).json({ message: 'This email is already used by another user.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const newPasswordHash = await bcrypt.hash(temporaryPassword, 10);

    await db.query('UPDATE users SET email = ?, password = ? WHERE id = ?', [
      updatedEmail,
      newPasswordHash,
      targetUser.id,
    ]);

    try {
      await sendPasswordResetEmail(updatedEmail, targetUser.name, temporaryPassword);
    } catch (mailErr) {
      await db.query('UPDATE users SET email = ?, password = ? WHERE id = ?', [
        targetUser.email,
        targetUser.password,
        targetUser.id,
      ]);
      throw mailErr;
    }

    appendActionLog(
      `SUPERVISOR EMAIL RESET | ${formatActorIdentity(req.user)} changed ${targetUser.username} email to ${updatedEmail}`
    );

    return res.json({
      message: 'Email updated. A temporary password has been sent to the new email. Ask the user to change it after first login.',
    });
  } catch (err) {
    logError('Supervisor reset user email error', err);
    return res.status(500).json({ message: 'Unable to update email right now.' });
  }
};

const listSupervisorResetUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT username, name, email, role, college_name
       FROM users
       WHERE username IS NOT NULL
         AND role = 'college'
       ORDER BY name ASC`
    );
    return res.json(rows);
  } catch (err) {
    logError('List supervisor reset users error', err);
    return res.status(500).json({ message: 'Unable to fetch usernames right now.' });
  }
};

const supervisorResetOperationalData = async (req, res) => {
  try {
    const [tableRows] = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_type = 'BASE TABLE'
         AND table_name <> 'users'`
    );

    const tableNames = tableRows.map((row) => row.table_name).filter(Boolean);

    if (tableNames.length === 0) {
      return res.json({ message: 'No non-user tables found to reset.', truncatedTables: [] });
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const tableName of tableNames) {
        await db.query(`TRUNCATE TABLE \`${String(tableName).replace(/`/g, '``')}\``);
      }
    } finally {
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    appendActionLog(
      `SUPERVISOR DATA RESET | ${formatActorIdentity(req.user)} truncated tables (users preserved): ${tableNames.join(', ')}`
    );

    return res.json({
      message: 'Database reset complete. All non-user tables were truncated and users were preserved.',
      truncatedTables: tableNames,
    });
  } catch (err) {
    logError('Supervisor reset operational data error', err);
    return res.status(500).json({ message: 'Unable to reset operational data right now.' });
  }
};

module.exports = {
  login,
  supervisorLogin,
  getMe,
  forgotPassword,
  changePassword,
  supervisorResetUserEmail,
  listSupervisorResetUsers,
  supervisorResetOperationalData,
  registerPushToken,
  unregisterPushToken,
};
