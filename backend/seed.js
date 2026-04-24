require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

const seed = async () => {
  const adminPass = await bcrypt.hash('admin123', 10);
  const collegePass = await bcrypt.hash('college123', 10);

  const users = [
    { name: 'System Admin', email: 'admin@auditorium.com', password: adminPass, role: 'admin', college_name: null },
    { name: 'College A Rep', email: 'college_a@edu.com', password: collegePass, role: 'college', college_name: 'College A' },
    { name: 'College B Rep', email: 'college_b@edu.com', password: collegePass, role: 'college', college_name: 'College B' },
    { name: 'College C Rep', email: 'college_c@edu.com', password: collegePass, role: 'college', college_name: 'College C' },
  ];

  for (const u of users) {
    await db.query(
      'INSERT INTO users (name, email, password, role, college_name) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), role=VALUES(role), college_name=VALUES(college_name)',
      [u.name, u.email, u.password, u.role, u.college_name]
    );
    console.log(`✓ Seeded: ${u.email}`);
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
