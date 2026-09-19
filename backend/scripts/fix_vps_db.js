const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const conn = new Client();
conn.on('ready', () => {
  const sql = "UPDATE customers SET is_deleted = 0, delete_reason = NULL, vehicle_plate = '2 Dubai 81788' WHERE id = 31; UPDATE loyalty SET wash_stamps = 0 WHERE customer_id IN (95, 212); UPDATE orders SET service_started_at = created_at WHERE service_started_at > DATE_ADD(created_at, INTERVAL 2 HOUR); UPDATE orders SET service_completed_at = DATE_ADD(COALESCE(service_started_at, created_at), INTERVAL 30 MINUTE) WHERE status = 'completed' AND (service_completed_at IS NULL OR service_completed_at < service_started_at); SELECT id, name, phone, vehicle_plate, is_deleted FROM customers WHERE id = 31; SELECT customer_id, points, wash_stamps FROM loyalty WHERE customer_id IN (95, 212);";

  conn.exec(`mysql -u root -p123456 sniper_car_care -e "${sql}"`, (err, stream) => {
    if (err) {
      console.error('SSH Error:', err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
    });
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
