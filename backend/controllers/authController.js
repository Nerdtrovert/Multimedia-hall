const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { sendPasswordResetEmail } = require('../utils/mailer');

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
    console.error('Login error:', err);
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
    console.error('Supervisor login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, college_name, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
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
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await db.query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, user.id]);

    try {
      await sendPasswordResetEmail(user.email, user.name, temporaryPassword);
    } catch (mailErr) {
      await db.query('UPDATE users SET password = ? WHERE id = ?', [user.password, user.id]);
      throw mailErr;
    }

    return res.json({ message: 'If the email exists, a temporary password has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Unable to process password reset right now.' });
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
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Unable to change password right now.' });
  }
};

module.exports = { login, supervisorLogin, getMe, forgotPassword, changePassword };
