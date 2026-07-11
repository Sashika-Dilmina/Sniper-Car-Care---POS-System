const pool = require('../config/database');

async function run() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    console.log('Adding order_id to services table...');
    // Check if column already exists
    const [columns] = await connection.query('SHOW COLUMNS FROM services LIKE "order_id"');
    if (columns.length > 0) {
      console.log('Column order_id already exists.');
    } else {
      await connection.query('ALTER TABLE services ADD COLUMN order_id INT NULL');
      await connection.query('ALTER TABLE services ADD CONSTRAINT fk_services_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE');
      console.log('Successfully added order_id and foreign key constraint.');
    }
    await connection.commit();
  } catch (err) {
    console.error('Migration failed:', err);
    await connection.rollback();
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
