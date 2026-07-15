const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    database: 'sniper_car_care',
    port: 3306
  });

  console.log('⚡ Connected to MySQL Database');

  try {
    // We want to fix the orders #260, #263, #264 where customer_id was incorrectly linked to 33 instead of 49.
    const [result] = await connection.query(
      `UPDATE orders o
       JOIN vip_bookings vb ON o.vip_booking_id = vb.id
       JOIN vip_customers vc ON vb.vip_customer_id = vc.id
       SET o.customer_id = 49
       WHERE o.id IN (260, 263, 264) AND o.customer_id = 33 AND vc.vehicle_model = 'B Dubai 72838'`
    );

    console.log(`✅ Updated ${result.affectedRows} orders: corrected links from customer 33 to 49 for vehicle plate B Dubai 72838.`);
    console.log('✨ DATABASE RECOVERY COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Error executing database fix:', error);
  } finally {
    await connection.end();
  }
}

run();
