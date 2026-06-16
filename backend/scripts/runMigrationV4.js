const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running database migration to make VIP bookings date/time nullable...');
    const migrationSql = fs.readFileSync(path.join(__dirname, '../../database/migration_make_vip_date_nullable.sql'), 'utf8');
    
    // Split queries by semicolon and filter empty ones
    const queries = migrationSql.split(';').map(q => q.trim()).filter(q => q.length > 0);
    
    for (let query of queries) {
      if (query.startsWith('USE ')) {
        continue; // database config handles default database
      }
      console.log(`Executing: ${query}`);
      await pool.query(query);
    }
    
    console.log('✅ Local Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Local Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
