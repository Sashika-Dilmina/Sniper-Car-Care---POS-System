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
    // 1. Find customer by plate 'B Dubai 72838'
    const [custRows] = await connection.query(
      'SELECT id, name FROM customers WHERE vehicle_plate = ?',
      ['B Dubai 72838']
    );

    if (custRows.length === 0) {
      console.log('❌ Customer with plate "B Dubai 72838" not found.');
      process.exit(1);
    }

    const customerId = custRows[0].id;
    console.log(`👤 Found Customer: ${custRows[0].name} (ID: ${customerId})`);

    // 2. Update service names in services table
    const [services] = await connection.query(
      'SELECT id, service_name, price FROM services WHERE customer_id = ? AND service_name LIKE ?',
      [customerId, 'Quick Book via Plate Link%']
    );

    console.log(`🔍 Found ${services.length} services to clean up.`);

    for (let s of services) {
      const price = parseFloat(s.price);
      let cleanName = 'Quick Wash';
      if (price === 30) {
        cleanName = 'Ceramic Wash';
      } else if (price === 25) {
        cleanName = 'Full Body Wash';
      } else if (price === 20) {
        cleanName = 'Body Wash';
      } else if (price === 5) {
        cleanName = 'Just Water';
      }
      
      await connection.query(
        'UPDATE services SET service_name = ? WHERE id = ?',
        [cleanName, s.id]
      );
      console.log(`✅ Updated service ID ${s.id}: "${s.service_name}" -> "${cleanName}"`);
    }

    // 3. Update stamps in loyalty table
    const [loyaltyRows] = await connection.query(
      'SELECT id, wash_stamps FROM loyalty WHERE customer_id = ?',
      [customerId]
    );

    if (loyaltyRows.length > 0) {
      await connection.query(
        'UPDATE loyalty SET wash_stamps = 5 WHERE customer_id = ?',
        [customerId]
      );
      console.log(`🎉 Updated loyalty wash stamps from ${loyaltyRows[0].wash_stamps} to 5`);
    } else {
      await connection.query(
        'INSERT INTO loyalty (customer_id, wash_stamps) VALUES (?, 5)',
        [customerId]
      );
      console.log('🎉 Inserted new loyalty record with 5 stamps');
    }

    console.log('✨ DATABASE RECOVERY COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Error executing database fix:', error);
  } finally {
    await connection.end();
  }
}

run();
