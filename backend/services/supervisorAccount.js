const bcrypt = require('bcryptjs');
const db = require('../config/db');

const getSupervisorConfig = () => {
  const password = String(process.env.SUPERVISOR_PASSWORD || '').trim();

  if (!password) {
    return null;
  }

  return { password };
};

const ensureSupervisorAccount = async () => {
  const supervisor = getSupervisorConfig();
  if (!supervisor) {
    throw new Error('Supervisor account sync failed: SUPERVISOR_PASSWORD is required.');
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
        password = VALUES(password),
        role = VALUES(role)`,
    ['system-supervisor', '', '', passwordHash]
  );
};


module.exports = {
  ensureSupervisorAccount,
};

