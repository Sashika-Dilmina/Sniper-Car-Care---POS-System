const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await pool.getConnection();
  try {
    console.log('🚀 Running UAE Plate Codes Seed v4 migration...');
    const migrationPath = path.join(__dirname, '../../database/migration_uae_plate_codes_v4.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split statements
    const statements = sql
      .split(';')
      .map(stmt => {
        // Remove line-by-line comments
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('USE '));

    for (const statement of statements) {
      console.log(`Executing statement: ${statement.substring(0, 80)}...`);
      await connection.query(statement);
    }

    console.log('✅ UAE Plate Codes Seed v4 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

runMigration();
