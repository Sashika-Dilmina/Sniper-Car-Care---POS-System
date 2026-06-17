const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running POS financials and credits migration...');
    const sqlPath = path.join(__dirname, '../../database/migration_pos_financials_and_credits.sql');
    const migrationSql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split queries by semicolon and filter out comments and empty statements
    const queries = migrationSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    for (let query of queries) {
      console.log(`Executing query:\n${query.substring(0, 100)}...`);
      await pool.query(query);
    }
    
    console.log('✅ Migration pos_financials_and_credits completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
