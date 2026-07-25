const mysql = require('mysql2/promise');
require('dotenv').config();

async function showYesterdayData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sniper_car_care',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Querying payments and orders from 2026-07-15...');

    // Find all payments on 2026-07-15
    const [payments] = await connection.query(`
      SELECT p.*, o.customer_id, o.source, o.total as order_total, o.notes as order_notes
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE DATE(p.created_at) = '2026-07-15' OR DATE(o.created_at) = '2026-07-15'
    `);

    console.log(`Found ${payments.length} payments/orders:`);
    payments.forEach(p => {
      console.log(JSON.stringify(p, null, 2));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

showYesterdayData();
