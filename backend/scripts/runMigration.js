const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running database migration to add vehicle_type to products...');
    const migrationSql = fs.readFileSync(path.join(__dirname, '../../database/migration_add_product_vehicle_type.sql'), 'utf8');
    
    // Split queries (by semicolon, if there are multiple, but here we just have a few lines)
    const queries = migrationSql.split(';').map(q => q.trim()).filter(q => q.length > 0);
    
    for (let query of queries) {
      if (query.startsWith('USE ')) {
        continue; // database config handles default database
      }
      console.log(`Executing: ${query}`);
      await pool.query(query);
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
