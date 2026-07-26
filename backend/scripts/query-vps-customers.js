const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS SSH');
  const remoteCmd = `node -e "
    const pool = require('/root/Sniper-Car-Care---POS-System/backend/config/database');
    async function run() {
      const [custs] = await pool.query('SELECT id, name, phone, vehicle_plate FROM customers LIMIT 10');
      console.log('--- CUSTOMERS IN VPS DB ---');
      console.log(JSON.stringify(custs, null, 2));

      const [orders] = await pool.query('SELECT id, customer_id, customer_name, vehicle_plate FROM orders ORDER BY id DESC LIMIT 10');
      console.log('--- ORDERS IN VPS DB ---');
      console.log(JSON.stringify(orders, null, 2));
      process.exit(0);
    }
    run();
  "`;

  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => console.log(data.toString()));
    stream.on('stderr', data => console.error(data.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: parseInt(process.env.DEPLOY_PORT || '22'),
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
