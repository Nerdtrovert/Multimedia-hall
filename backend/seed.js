const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const db = require('./config/db');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const seed = async () => {
  await db.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','college') NOT NULL DEFAULT 'college'"
  );

  const adminPass = await bcrypt.hash('admin123', 10);
  const collegePass = await bcrypt.hash('college123', 10);
  const supervisorEmail = String(process.env.SUPERVISOR_EMAIL || 'supervisor@auditorium.com')
    .trim()
    .toLowerCase();
  const supervisorPassword =
    String(process.env.SUPERVISOR_PASSWORD || '').trim() ||
    `Sup-${crypto.randomBytes(8).toString('base64url')}`;
  const supervisorPassHash = await bcrypt.hash(supervisorPassword, 10);

  const users = [
    { name: 'System Admin', email: 'admin@auditorium.com', password: adminPass, role: 'admin', college_name: null },
    { name: 'Dr H N National College of Engineering Rep', email: 'college_a@edu.com', password: collegePass, role: 'college', college_name: 'Dr H N National College of Engineering' },
    { name: 'National College Jayanagar Rep', email: 'college_b@edu.com', password: collegePass, role: 'college', college_name: 'National College Jayanagar' },
    { name: 'National PU College Rep', email: 'college_c@edu.com', password: collegePass, role: 'college', college_name: 'National PU College' },
  ];

  for (const u of users) {
    await db.query(
      'INSERT INTO users (name, email, password, role, college_name) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), role=VALUES(role), college_name=VALUES(college_name)',
      [u.name, u.email, u.password, u.role, u.college_name]
    );
    console.log(`✓ Seeded: ${u.email}`);
  }

  const [supervisorInsert] = await db.query(
    `INSERT IGNORE INTO users (name, email, password, role, college_name)
     VALUES (?, ?, ?, ?, ?)`,
    ['Emergency Supervisor', supervisorEmail, supervisorPassHash, 'supervisor', null]
  );

  if (supervisorInsert.affectedRows > 0) {
    console.log(`✓ Seeded one-time supervisor account: ${supervisorEmail}`);
    console.log(`  Supervisor password (save securely): ${supervisorPassword}`);
  } else {
    console.log(`✓ Supervisor account already exists: ${supervisorEmail}`);
  }

  console.log('\nSeed complete!');
  console.log('Admin login:    admin@auditorium.com  /  admin123');
  console.log('College login:  college_a@edu.com     /  college123');
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
