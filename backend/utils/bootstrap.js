const db = require('../config/db');
const { ensureUploadDirectories } = require('./fileStorage');

const BOOKING_COLUMNS = [
  { name: 'poster_url', definition: 'VARCHAR(255) NULL' },
  { name: 'poster_name', definition: 'VARCHAR(255) NULL' },
  { name: 'attachment_url', definition: 'VARCHAR(255) NULL' },
  { name: 'attachment_name', definition: 'VARCHAR(255) NULL' },
];

const ensureBookingColumns = async () => {
  const [columns] = await db.query('SHOW COLUMNS FROM bookings');
  const existingColumns = new Set(columns.map((column) => column.Field));

  for (const column of BOOKING_COLUMNS) {
    if (!existingColumns.has(column.name)) {
      await db.query(`ALTER TABLE bookings ADD COLUMN ${column.name} ${column.definition}`);
    }
  }
};

const bootstrapApp = async () => {
  await ensureUploadDirectories();
  await ensureBookingColumns();
};

module.exports = { bootstrapApp };
