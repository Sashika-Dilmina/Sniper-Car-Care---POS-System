const pool = require('../config/database');

async function checkOrder() {
  try {
    const [rows] = await pool.query("SELECT id, status, payment_status, service_started_at, service_completed_at FROM orders WHERE id = 9");
    console.log('Order #9 details in database:', rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkOrder();
