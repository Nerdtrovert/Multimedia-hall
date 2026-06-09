const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInteger(process.env.DB_PORT, 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auditorium_db',
  waitForConnections: true,
  connectionLimit: parseInteger(process.env.DB_CONNECTION_LIMIT, 10),
  queueLimit: 0,
});

module.exports = pool;
