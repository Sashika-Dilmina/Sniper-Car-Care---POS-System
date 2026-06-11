const pool = require('../config/database');

async function resetOrder() {
  try {
    console.log('RESETTING Order #9 status to pending...');
    await pool.query("UPDATE orders SET status = 'pending', service_started_at = NULL, service_completed_at = NULL WHERE id = 9");
    console.log('✅ Order #9 has been reset to pending successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
}

resetOrder();
