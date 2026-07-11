const pool = require('../config/database');

async function inspectSchema() {
  try {
    const [columns] = await pool.query('DESCRIBE services');
    console.log('Columns of services table:');
    console.table(columns);
  } catch (err) {
    console.error('Failed to describe services table:', err);
  } finally {
    await pool.end();
  }
}

inspectSchema();
