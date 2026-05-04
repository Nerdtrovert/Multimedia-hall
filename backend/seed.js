const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./config/db');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const isIgnorableMigrationError = (error, codes) => Boolean(error && codes.includes(error.code));

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const ensureUsernameColumn = async () => {
  try {
    await db.query('ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER id');
  } catch (error) {
    if (!isIgnorableMigrationError(error, ['ER_DUP_FIELDNAME'])) {
      throw error;
    }
  }
};

const ensureUsernameUniqueIndex = async () => {
  try {
    await db.query('CREATE UNIQUE INDEX uq_users_username ON users (username)');
  } catch (error) {
    if (!isIgnorableMigrationError(error, ['ER_DUP_KEYNAME'])) {
      throw error;
    }
  }
};

const seed = async () => {
  try {
    await db.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','college') NOT NULL DEFAULT 'college'"
    );
    await ensureUsernameColumn();
    await ensureUsernameUniqueIndex();

    const adminPass = await bcrypt.hash('admin123', 10);
    const collegePass = await bcrypt.hash('college123', 10);
    const users = [
      { username: 'nes-admin', name: 'NES Admin', email: 'prajwalnavada74@gmail.com', password: adminPass, role: 'admin', college_name: null },
      { username: 'dr-hn-national-college', name: 'Dr H N National College of Engineering', email: 'prajwal3363@gmail.com', password: collegePass, role: 'college', college_name: 'Dr H N National College of Engineering' },
      { username: 'national-college-jayanagar', name: 'National College Jayanagar', email: 'college_b@edu.com', password: collegePass, role: 'college', college_name: 'National College Jayanagar' },
      { username: 'national-pu-college', name: 'National PU College', email: 'college_c@edu.com', password: collegePass, role: 'college', college_name: 'National PU College' },
    ];

    for (const u of users) {
      const normalizedEmail = normalizeEmail(u.email);
      const [usernameRows] = await db.query('SELECT id FROM users WHERE username = ? LIMIT 1', [u.username]);

      if (usernameRows.length > 0) {
        await db.query('UPDATE users SET email = ? WHERE id = ?', [normalizedEmail, usernameRows[0].id]);
        console.log(`Updated seeded user email by username: ${u.username}`);
        continue;
      }

      const lookupQuery =
        u.role === 'admin'
          ? 'SELECT id FROM users WHERE role = ? LIMIT 1'
          : 'SELECT id FROM users WHERE role = ? AND college_name = ? LIMIT 1';
      const lookupParams = u.role === 'admin' ? [u.role] : [u.role, u.college_name];
      const [legacyRows] = await db.query(lookupQuery, lookupParams);

      if (legacyRows.length > 0) {
        await db.query(
          'UPDATE users SET username = ?, email = ? WHERE id = ?',
          [u.username, normalizedEmail, legacyRows[0].id]
        );
        console.log(`Mapped legacy seeded user: ${u.username}`);
        continue;
      }

      await db.query(
        'INSERT INTO users (username, name, email, password, role, college_name) VALUES (?, ?, ?, ?, ?, ?)',
        [u.username, u.name, normalizedEmail, u.password, u.role, u.college_name]
      );
      console.log(`Inserted seeded user: ${u.username}`);
    }
  } finally {
    await db.end();
  }
};

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
