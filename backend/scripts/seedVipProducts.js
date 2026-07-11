const pool = require('../config/database');

async function run() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    console.log('Checking for VIP products in products table...');
    
    // Check Saloon VIP Service
    const [saloonVip] = await connection.query('SELECT id FROM products WHERE name = "Saloon VIP Service"');
    if (saloonVip.length === 0) {
      await connection.query(`
        INSERT INTO products (name, description, category, price, stock, vehicle_type, purchase_price)
        VALUES ('Saloon VIP Service', 'Standard Saloon VIP package', 'Services', 75.00, 0, 'Saloon', 0.00)
      `);
      console.log('Inserted Saloon VIP Service.');
    } else {
      console.log('Saloon VIP Service already exists.');
    }

    // Check 4x4 VIP Service
    const [fourWheelVip] = await connection.query('SELECT id FROM products WHERE name = "4x4 VIP Service"');
    if (fourWheelVip.length === 0) {
      await connection.query(`
        INSERT INTO products (name, description, category, price, stock, vehicle_type, purchase_price)
        VALUES ('4x4 VIP Service', 'Standard 4x4 VIP package', 'Services', 90.00, 0, '4x4', 0.00)
      `);
      console.log('Inserted 4x4 VIP Service.');
    } else {
      console.log('4x4 VIP Service already exists.');
    }

    await connection.commit();
    console.log('VIP products seeding committed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
    await connection.rollback();
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
