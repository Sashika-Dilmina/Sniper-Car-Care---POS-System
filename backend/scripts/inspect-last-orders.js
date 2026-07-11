const pool = require('../config/database');

async function checkOrders() {
  try {
    const [rows] = await pool.query('SELECT id, customer_id, total, created_at FROM orders ORDER BY id DESC LIMIT 10');
    console.log('Last 10 orders:');
    console.table(rows);
  } catch (err) {
    console.error('Failed to get orders:', err);
  } finally {
    await pool.end();
  }
}

checkOrders();
