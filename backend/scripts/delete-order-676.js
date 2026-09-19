const pool = require('../config/database');
const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function deleteLocalOrder676() {
  try {
    console.log('Checking Order #676 in local database...');
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = 676');
    if (orders.length === 0) {
      console.log('Local DB: Order #676 not found or already deleted.');
      return;
    }
    console.log('Local DB: Order #676 found:', orders[0]);

    await pool.query('DELETE FROM order_items WHERE order_id = 676');
    await pool.query('DELETE FROM payments WHERE order_id = 676');
    await pool.query('DELETE FROM services WHERE order_id = 676');
    await pool.query('DELETE FROM credit_payments WHERE credit_id IN (SELECT id FROM customer_credits WHERE order_id = 676)');
    await pool.query('DELETE FROM customer_credits WHERE order_id = 676');
    await pool.query('DELETE FROM feedback WHERE order_id = 676').catch(() => {});
    const [result] = await pool.query('DELETE FROM orders WHERE id = 676');
    console.log('Local deletion result:', result.affectedRows, 'row(s) deleted.');
  } catch (err) {
    console.log('Local DB deletion note:', err.message);
  }
}

async function deleteVpsOrder676() {
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
      console.log('⚡ Connected to VPS. Deleting Order #676 on VPS...');
      const cmd = `
        NODE_ENV=production node -e "
          const pool = require('./config/database');
          async function run() {
            const [orders] = await pool.query('SELECT * FROM orders WHERE id = 676');
            console.log('VPS Order 676:', orders);
            await pool.query('DELETE FROM order_items WHERE order_id = 676');
            await pool.query('DELETE FROM payments WHERE order_id = 676');
            await pool.query('DELETE FROM services WHERE order_id = 676');
            await pool.query('DELETE FROM credit_payments WHERE credit_id IN (SELECT id FROM customer_credits WHERE order_id = 676)');
            await pool.query('DELETE FROM customer_credits WHERE order_id = 676');
            await pool.query('DELETE FROM feedback WHERE order_id = 676').catch(() => {});
            const [res] = await pool.query('DELETE FROM orders WHERE id = 676');
            console.log('VPS delete result:', res.affectedRows, 'row(s) deleted.');
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
  await deleteLocalOrder676();
  await deleteVpsOrder676();
  process.exit(0);
}

main();
