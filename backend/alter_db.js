const db = require('./config/db');

async function migrate() {
  try {
    console.log('Adding poster_data column...');
    await db.query('ALTER TABLE bookings ADD COLUMN poster_data LONGBLOB;');
    console.log('Column poster_data added successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column poster_data already exists.');
    } else {
      console.error('Migration error:', error);
    }
  } finally {
    process.exit();
  }
}

migrate();
