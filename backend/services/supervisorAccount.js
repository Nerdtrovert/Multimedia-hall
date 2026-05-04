const bcrypt = require('bcryptjs');
const db = require('../config/db');

const getSupervisorConfig = () => {
  const name = String(process.env.SUPERVISOR_NAME || '').trim();
  const email = String(process.env.SUPERVISOR_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SUPERVISOR_PASSWORD || '').trim();

  if (!name || !email || !password) {
    return null;
  }

  return { name, email, password };
};

const ensureSupervisorAccount = async () => {
  const supervisor = getSupervisorConfig();
  if (!supervisor) {
    throw new Error('Supervisor account sync failed: SUPERVISOR_NAME, SUPERVISOR_EMAIL, and SUPERVISOR_PASSWORD are required.');
  }

  await db.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','college') NOT NULL DEFAULT 'college'"
  );
  try {
    await db.query('ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER id');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await db.query('CREATE UNIQUE INDEX uq_users_username ON users (username)');
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME') {
      throw error;
    }
  }

  const passwordHash = await bcrypt.hash(supervisor.password, 10);
  await db.query(
    `INSERT INTO users (username, name, email, password, role, college_name)
     VALUES (?, ?, ?, ?, 'supervisor', NULL)
     ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       name = VALUES(name),
       password = VALUES(password),
       role = VALUES(role),
        college_name = VALUES(college_name)`,
    ['system-supervisor', supervisor.name, supervisor.email, passwordHash]
  );
};

module.exports = {
  ensureSupervisorAccount,
};
