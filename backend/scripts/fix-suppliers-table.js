const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sniper_car_care',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Checking suppliers table columns...');
    const [columns] = await connection.query('SHOW COLUMNS FROM suppliers');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('business_name')) {
      console.log('Adding business_name column...');
      await connection.query('ALTER TABLE suppliers ADD COLUMN business_name VARCHAR(100) NULL AFTER name');
    }
    if (!columnNames.includes('category')) {
      console.log('Adding category column...');
      await connection.query('ALTER TABLE suppliers ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT "Products" AFTER phone');
    }
    if (!columnNames.includes('status')) {
      console.log('Adding status column...');
      await connection.query('ALTER TABLE suppliers ADD COLUMN status ENUM("active", "inactive") DEFAULT "active" AFTER address');
    }
    console.log('Database table suppliers altered successfully!');
  } catch (err) {
    console.error('Error altering suppliers table:', err);
  } finally {
    await connection.end();
  }
}

run();
