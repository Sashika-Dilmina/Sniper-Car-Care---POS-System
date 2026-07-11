const pool = require('../config/database');

async function run() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    console.log('Modifying products.category ENUM in products table...');
    // Alter the enum list to include 'Acce'
    await connection.query(`
      ALTER TABLE products 
      MODIFY COLUMN category ENUM('Accessories', 'Services', 'Spare Parts', 'Car Freshner', 'Acce') NOT NULL
    `);
    console.log('Updated column category enum.');

    // Update existing products from 'Accessories' to 'Acce'
    await connection.query(`
      UPDATE products SET category = 'Acce' WHERE category = 'Accessories'
    `);
    console.log('Updated Accessories products to Acce.');

    await connection.commit();
    console.log('Product category migration committed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    await connection.rollback();
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
