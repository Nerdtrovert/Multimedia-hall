const db = require('../config/db');

const ADMIN_NAME = 'NES Admin';
const DEFAULT_ADMIN_USERNAME = 'nes-admin';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const ensureAdminProfile = async () => {
  const configuredUsername = String(process.env.SEED_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).trim() || DEFAULT_ADMIN_USERNAME;
  const configuredEmail = normalizeEmail(process.env.SEED_ADMIN_EMAIL);

  const [byUsername] = await db.query(
    'SELECT id, email FROM users WHERE username = ? LIMIT 1',
    [configuredUsername]
  );

  if (byUsername.length > 0) {
    const admin = byUsername[0];
    await db.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [ADMIN_NAME, configuredEmail || admin.email, admin.id]
    );
    return;
  }

  const [byRole] = await db.query(
    "SELECT id, email FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
  );

  if (byRole.length === 0) {
    return;
  }

  const admin = byRole[0];
  await db.query(
    'UPDATE users SET username = ?, name = ?, email = ? WHERE id = ?',
    [configuredUsername, ADMIN_NAME, configuredEmail || admin.email, admin.id]
  );
};

module.exports = { ensureAdminProfile };
