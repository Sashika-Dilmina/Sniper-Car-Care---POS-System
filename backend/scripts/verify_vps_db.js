const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const conn = new Client();
conn.on('ready', () => {
  conn.exec('mysql -u root -p123456 sniper_car_care -e "SELECT id, name, phone, vehicle_plate, is_deleted FROM customers WHERE id = 31; SELECT customer_id, points, wash_stamps FROM loyalty WHERE customer_id = 95;"', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
