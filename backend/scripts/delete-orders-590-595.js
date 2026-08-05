const pool = require('../config/database');
const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const targetOrderIds = [590, 595];

async function deleteLocalOrders() {
  try {
    console.log(`Deleting Orders #${targetOrderIds.join(', #')} from local database...`);
    await pool.query('DELETE FROM order_items WHERE order_id IN (?)', [targetOrderIds]);
    await pool.query('DELETE FROM payments WHERE order_id IN (?)', [targetOrderIds]);
    await pool.query('DELETE FROM services WHERE order_id IN (?)', [targetOrderIds]);
    await pool.query('DELETE FROM customer_credits WHERE order_id IN (?)', [targetOrderIds]);
    await pool.query('DELETE FROM feedback WHERE order_id IN (?)', [targetOrderIds]).catch(() => {});
    const [result] = await pool.query('DELETE FROM orders WHERE id IN (?)', [targetOrderIds]);
    console.log('Local deletion result:', result.affectedRows, 'row(s) deleted.');
  } catch (err) {
    console.error('Local deletion error:', err.message);
  }
}

async function deleteVpsOrders() {
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
      console.log(`⚡ Connected to VPS. Deleting Orders #${targetOrderIds.join(', #')} on VPS...`);
      const cmd = `
        NODE_ENV=production node -e "
          const pool = require('./config/database');
          async function run() {
            const ids = [590, 595];
            await pool.query('DELETE FROM order_items WHERE order_id IN (?)', [ids]);
            await pool.query('DELETE FROM payments WHERE order_id IN (?)', [ids]);
            await pool.query('DELETE FROM services WHERE order_id IN (?)', [ids]);
            await pool.query('DELETE FROM customer_credits WHERE order_id IN (?)', [ids]);
            await pool.query('DELETE FROM feedback WHERE order_id IN (?)', [ids]).catch(() => {});
            const [res] = await pool.query('DELETE FROM orders WHERE id IN (?)', [ids]);
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
  await deleteLocalOrders();
  await deleteVpsOrders();
  process.exit(0);
}

main();
