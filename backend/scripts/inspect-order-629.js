const pool = require('../config/database');
const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function inspectVpsOrder629() {
  if (!process.env.DEPLOY_HOST || !process.env.DEPLOY_USER) {
    console.log('VPS credentials not configured.');
    return;
  }

  const config = {
    host: process.env.DEPLOY_HOST,
    port: parseInt(process.env.DEPLOY_PORT || '22'),
    username: process.env.DEPLOY_USER,
    password: process.env.DEPLOY_PASS,
    readyTimeout: 30000
  };

  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log('⚡ Connected to VPS. Inspecting Order #629...');
      const cmd = `
        NODE_ENV=production node -e "
          const pool = require('./config/database');
          async function run() {
            const [order] = await pool.query('SELECT * FROM orders WHERE id = 629');
            console.log('--- Order 629 ---');
            console.log(order);
            const [payments] = await pool.query('SELECT * FROM payments WHERE order_id = 629');
            console.log('--- Payments for 629 ---');
            console.log(payments);
            process.exit(0);
          }
          run().catch(err => { console.error(err); process.exit(1); });
        "
      `;
      conn.exec(`cd /root/Sniper-Car-Care---POS-System/backend && ${cmd}`, (err, stream) => {
        if (err) {
          console.error('VPS Exec error:', err);
          conn.end();
          resolve();
          return;
        }
        stream.on('close', () => {
          conn.end();
          resolve();
        }).on('data', (d) => process.stdout.write(d.toString()))
          .stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    }).on('error', (err) => {
      console.error('VPS Connection error:', err.message);
      resolve();
    }).connect(config);
  });
}

inspectVpsOrder629();
