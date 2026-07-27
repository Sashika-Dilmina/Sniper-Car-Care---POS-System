const { Client } = require('ssh2');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  host: process.env.DEPLOY_HOST,
  port: parseInt(process.env.DEPLOY_PORT || '22'),
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS,
  readyTimeout: 60000
};

const conn = new Client();

conn.on('ready', () => {
  console.log('⚡ Connected to VPS. Checking and permanently deleting order 579...\n');
  
  const cmd = `
    mysql -u root sniper_car_care -e "
      SELECT id, customer_id, total, status, payment_status, created_at FROM orders WHERE id = 579;
      DELETE FROM order_items WHERE order_id = 579;
      DELETE FROM payments WHERE order_id = 579;
      DELETE FROM services WHERE order_id = 579;
      DELETE FROM customer_credits WHERE order_id = 579;
      DELETE FROM customer_notifications WHERE order_id = 579;
      DELETE FROM orders WHERE id = 579;
      SELECT 'Order 579 deleted successfully' as result;
    "
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => process.stdout.write(d.toString()))
      .stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
}).connect(config);
