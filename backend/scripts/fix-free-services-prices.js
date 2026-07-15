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
    // Find all services with price = 0.00
    const [services] = await connection.query(
      `SELECT s.id, s.service_name, s.vehicle_type, s.price 
       FROM services s 
       JOIN orders o ON s.order_id = o.id 
       WHERE s.price = 0.00 AND o.payment_status = 'free'`
    );

    console.log(`🔍 Found ${services.length} free service records with 0.00 price.`);

    for (let s of services) {
      const name = s.service_name.toLowerCase().trim();
      const is4x4 = s.vehicle_type === '4x4';
      let originalPrice = 0.00;

      if (name.includes('full body') || name.includes('full service') || name.includes('full wash')) {
        originalPrice = is4x4 ? 25.00 : 20.00;
      } else if (name.includes('double soap')) {
        originalPrice = is4x4 ? 30.00 : 25.00;
      } else if (name.includes('ceramic')) {
        originalPrice = is4x4 ? 30.00 : 25.00;
      }

      if (originalPrice > 0) {
        await connection.query(
          'UPDATE services SET price = ? WHERE id = ?',
          [originalPrice, s.id]
        );
        console.log(`✅ Updated service ID ${s.id} ("${s.service_name}", ${s.vehicle_type}): price set to ${originalPrice} AED`);
      }
    }

    console.log('✨ FREE SERVICES PRICES CORRECTION COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Error executing database fix:', error);
  } finally {
    await connection.end();
  }
}

run();
