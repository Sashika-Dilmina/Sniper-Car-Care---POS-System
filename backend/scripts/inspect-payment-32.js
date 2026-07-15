const pool = require('../config/database');

async function checkPayment() {
  try {
    const [payments] = await pool.query('SELECT * FROM payments WHERE order_id = 32');
    console.log('Payments for order 32:');
    console.table(payments);
  } catch (err) {
    console.error('Failed to get payments:', err);
  } finally {
    await pool.end();
  }
}

checkPayment();
