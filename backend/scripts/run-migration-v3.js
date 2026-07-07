const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('Starting UAE Plate Codes v3 migration...');
  const connection = await pool.getConnection();
  try {
    const migrationPath = path.join(__dirname, '../../database/migration_uae_plate_codes_v3.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split statements by semicolon (simple parser)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    for (const statement of statements) {
      // Avoid executing USE statements if not needed, but we can execute them
      if (statement.toLowerCase().startsWith('use ')) {
        continue;
      }
      console.log(`Executing statement: ${statement.substring(0, 50)}...`);
      await connection.query(statement);
    }

    console.log('✅ UAE Plate Codes v3 migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

runMigration();
