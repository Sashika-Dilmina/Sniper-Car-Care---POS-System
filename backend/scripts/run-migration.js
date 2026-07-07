const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('Starting VIP Booking link migration...');
  const connection = await pool.getConnection();
  try {
    // Check if column already exists
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM orders LIKE 'vip_booking_id'"
    );

    if (columns.length > 0) {
      console.log('Column vip_booking_id already exists in orders table. Skipping.');
      return;
    }

    const migrationPath = path.join(__dirname, '../../database/migration_add_vip_booking_link.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split statements (simple parser)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing statement: ${statement.substring(0, 50)}...`);
      await connection.query(statement);
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

runMigration();
