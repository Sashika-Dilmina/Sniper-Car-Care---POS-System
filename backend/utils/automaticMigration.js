const pool = require('../config/database');

async function runSoftDeleteMigrations() {
  const tables = [
    'users',
    'customers',
    'expenses',
    'suppliers',
    'purchases',
    'products',
    'services',
    'orders',
    'feedback',
    'vip_bookings'
  ];

  console.log('[Migration] Checking soft delete columns...');
  for (const table of tables) {
    try {
      // Check if is_deleted column exists
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = 'is_deleted'
      `, [table]);

      if (columns.length === 0) {
        console.log(`[Migration] Adding is_deleted and delete_reason to table: ${table}...`);
        await pool.query(`
          ALTER TABLE \`${table}\` 
          ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0,
          ADD COLUMN delete_reason VARCHAR(255) NULL
        `);
        console.log(`[Migration] Added columns to ${table} successfully.`);
      }
    } catch (err) {
      console.error(`[Migration] Failed to add soft delete columns to ${table}:`, err.message);
    }
  }

  // Check and add is_active column for products and services
  for (const table of ['products', 'services']) {
    try {
      const [activeCols] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = 'is_active'
      `, [table]);

      if (activeCols.length === 0) {
        console.log(`[Migration] Adding is_active to table: ${table}...`);
        await pool.query(`
          ALTER TABLE \`${table}\` 
          ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1
        `);
        console.log(`[Migration] Added is_active to ${table} successfully.`);
      }
    } catch (err) {
      console.error(`[Migration] Failed to add is_active column to ${table}:`, err.message);
    }
  }

  // Update ENUM definition or category names for products table if needed
  try {
    await pool.query(`
      ALTER TABLE products MODIFY COLUMN category VARCHAR(100) NOT NULL
    `);
  } catch (err) {
    // Column may already be VARCHAR
  }
}

module.exports = runSoftDeleteMigrations;
