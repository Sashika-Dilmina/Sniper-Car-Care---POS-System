const pool = require('../config/database');

async function inspectPaymentsTable() {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM payments');
    console.log('Columns in payments table:');
    console.table(columns);
  } catch (err) {
    console.error('Failed to inspect payments table:', err);
  } finally {
    await pool.end();
  }
}

inspectPaymentsTable();
