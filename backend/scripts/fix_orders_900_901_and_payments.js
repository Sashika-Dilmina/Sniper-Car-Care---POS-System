const pool = require('../config/database');
const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const targetDeleteOrders = [900, 901];
const targetPaidOrders = [639, 658, 659, 670, 692, 775];

async function fixLocalDatabase() {
  console.log('=== 🛠️ Local Database Processing ===');
  try {
    // 1. Delete orders 900 & 901
    await pool.query('DELETE FROM order_items WHERE order_id IN (?, ?)', targetDeleteOrders);
    await pool.query('DELETE FROM payments WHERE order_id IN (?, ?)', targetDeleteOrders);
    await pool.query('DELETE FROM services WHERE order_id IN (?, ?)', targetDeleteOrders);
    await pool.query('DELETE FROM credit_payments WHERE credit_id IN (SELECT id FROM customer_credits WHERE order_id IN (?, ?))', targetDeleteOrders);
    await pool.query('DELETE FROM customer_credits WHERE order_id IN (?, ?)', targetDeleteOrders);
    await pool.query('DELETE FROM feedback WHERE order_id IN (?, ?)', targetDeleteOrders).catch(() => {});
    const [delRes] = await pool.query('DELETE FROM orders WHERE id IN (?, ?)', targetDeleteOrders);
    console.log(`✅ Local DB: Deleted ${delRes.affectedRows} order(s) for IDs:`, targetDeleteOrders);

    // 2. Update payment status to paid for 639, 658, 659, 670, 692, 775
    const [updRes] = await pool.query('UPDATE orders SET payment_status = "paid" WHERE id IN (?)', [targetPaidOrders]);
    console.log(`✅ Local DB: Updated payment_status = 'paid' for ${updRes.affectedRows} order(s).`);

    await pool.query('UPDATE payments SET status = "completed" WHERE order_id IN (?)', [targetPaidOrders]);
    
    // Insert missing payment records
    const [inserted] = await pool.query(`
      INSERT INTO payments (order_id, amount, method, status)
      SELECT o.id, o.total, 'cash', 'completed'
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id IN (?) AND p.id IS NULL
    `, [targetPaidOrders]);
    console.log(`✅ Local DB: Inserted ${inserted.affectedRows} missing payment record(s).`);
  } catch (err) {
    console.log('Local DB note:', err.message);
  }
}

async function fixVpsDatabase() {
  console.log('\n=== ⚡ Hostinger VPS Database Processing ===');
  if (!process.env.DEPLOY_HOST || !process.env.DEPLOY_USER) {
    console.log('VPS credentials not configured, skipping VPS execution.');
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
      console.log('⚡ Connected to Hostinger VPS SSH.');
      const repoPath = '/root/Sniper-Car-Care---POS-System';
      const sqlCmd = `
        cd ${repoPath} && git fetch --all && git reset --hard origin/ravix &&
        mysql -u root -p123456 sniper_car_care < database/migration_delete_orders_900_901_update_payments.sql &&
        mysql -u root -p123456 sniper_car_care -e "SELECT id, payment_status, total FROM orders WHERE id IN (639, 658, 659, 670, 692, 775);" &&
        mysql -u root -p123456 sniper_car_care -e "SELECT id FROM orders WHERE id IN (900, 901);"
      `;

      conn.exec(sqlCmd, (err, stream) => {
        if (err) {
          console.error('VPS exec error:', err);
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
  await fixLocalDatabase();
  await fixVpsDatabase();
  process.exit(0);
}

main();
