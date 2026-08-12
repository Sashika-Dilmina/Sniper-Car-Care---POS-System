const pool = require('../config/database');

async function check() {
  const [rows] = await pool.query(`
    SELECT id, status, payment_status, created_at, service_started_at, service_completed_at, updated_at,
           TIMESTAMPDIFF(MINUTE, COALESCE(service_started_at, created_at), COALESCE(service_completed_at, updated_at)) as duration_completed,
           TIMESTAMPDIFF(MINUTE, COALESCE(service_started_at, created_at), NOW()) as duration_ongoing
    FROM orders
    ORDER BY id DESC LIMIT 15
  `);
  console.log(rows);
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
