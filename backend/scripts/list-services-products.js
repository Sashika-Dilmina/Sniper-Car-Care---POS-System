const pool = require('../config/database');

async function inspect() {
  try {
    const [rows] = await pool.query('SELECT id, name, category, price, vehicle_type FROM products WHERE category = "Services"');
    console.log('--- Services in products table ---');
    console.table(rows);
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await pool.end();
  }
}

inspect();
