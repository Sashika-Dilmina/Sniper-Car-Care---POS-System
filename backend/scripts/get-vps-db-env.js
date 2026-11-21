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
  console.log('⚡ Connected to VPS. Reading DB config & deleting order 579...\n');
  
  const cmd = `
    NODE_ENV=production node -e "
      const pool = require('./config/database');
      async function run() {
        const [rows] = await pool.query('SELECT id, customer_id, total, status, payment_status FROM orders WHERE id = 579');
        console.log('Target order:', rows);
        await pool.query('DELETE FROM order_items WHERE order_id = 579');
        await pool.query('DELETE FROM payments WHERE order_id = 579');
        await pool.query('DELETE FROM services WHERE order_id = 579');
        await pool.query('DELETE FROM customer_credits WHERE order_id = 579');
        const [res] = await pool.query('DELETE FROM orders WHERE id = 579');
        console.log('Delete result:', res);
        process.exit(0);
      }
      run().catch(err => { console.error(err); process.exit(1); });
    "
  `;

  conn.exec(`cd /root/Sniper-Car-Care---POS-System/backend && ${cmd}`, (err, stream) => {
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
