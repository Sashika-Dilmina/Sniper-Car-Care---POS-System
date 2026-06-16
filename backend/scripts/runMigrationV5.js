const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running database migration to add customer notifications and staff notes...');
    const migrationSql = fs.readFileSync(path.join(__dirname, '../../database/migration_vip_notes_and_notifications.sql'), 'utf8');
    
    // Split queries by semicolon and filter empty ones
    const queries = migrationSql.split(';').map(q => q.trim()).filter(q => q.length > 0);
    
    for (let query of queries) {
      if (query.startsWith('USE ')) {
        continue; // database config handles default database
      }
      console.log(`Executing: ${query}`);
      await pool.query(query);
    }
    
    console.log('✅ Local Migration V5 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Local Migration V5 failed:', error);
    process.exit(1);
  }
}

runMigration();
