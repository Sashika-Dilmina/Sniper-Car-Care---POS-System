const pool = require('../config/database');
const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function deleteLocalOrder587() {
  try {
    console.log('Deleting Order #587 from local database...');
    await pool.query('DELETE FROM order_items WHERE order_id = 587');
    await pool.query('DELETE FROM payments WHERE order_id = 587');
    await pool.query('DELETE FROM services WHERE order_id = 587');
    await pool.query('DELETE FROM customer_credits WHERE order_id = 587');
    const [result] = await pool.query('DELETE FROM orders WHERE id = 587');
    console.log('Local deletion result:', result.affectedRows, 'row(s) deleted.');
  } catch (err) {
    console.error('Local deletion error:', err.message);
  }
}

async function deleteVpsOrder587() {
  if (!process.env.DEPLOY_HOST || !process.env.DEPLOY_USER) {
    console.log('VPS credentials not configured, skipping VPS deletion.');
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
      console.log('⚡ Connected to VPS. Deleting Order #587 on VPS...');
      const cmd = `
        NODE_ENV=production node -e "
          const pool = require('./config/database');
          async function run() {
            await pool.query('DELETE FROM order_items WHERE order_id = 587');
            await pool.query('DELETE FROM payments WHERE order_id = 587');
            await pool.query('DELETE FROM services WHERE order_id = 587');
            await pool.query('DELETE FROM customer_credits WHERE order_id = 587');
            const [res] = await pool.query('DELETE FROM orders WHERE id = 587');
            console.log('VPS delete result:', res);
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

async function main() {
  await deleteLocalOrder587();
  await deleteVpsOrder587();
  process.exit(0);
}

main();
