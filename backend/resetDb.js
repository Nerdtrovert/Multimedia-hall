const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const quoteIdent = (value) => `\`${String(value).replace(/`/g, '``')}\``;

const stripBootstrapStatements = (sql) =>
  sql
    .replace(/^\s*CREATE DATABASE[^;]*;\s*/im, '')
    .replace(/^\s*USE[^;]*;\s*/im, '')
    .replace(/^\s*INSERT\s+IGNORE\s+INTO\s+users[\s\S]*?;\s*/gim, '');

async function main() {
  const dbName = process.env.DB_NAME || 'auditorium_db';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdent(dbName)}`);
    await connection.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
    await connection.query(`USE ${quoteIdent(dbName)}`);

    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const rawSchema = fs.readFileSync(schemaPath, 'utf8');
    const executableSchema = stripBootstrapStatements(rawSchema);
    await connection.query(executableSchema);

    console.log(`Database reset complete: ${dbName}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Database reset failed:', err.message);
  process.exit(1);
});
