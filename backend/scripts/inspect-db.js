const pool = require('../config/database');

async function inspect() {
  try {
    const tables = ['users', 'customers', 'products', 'suppliers', 'services', 'orders', 'order_items', 'payments', 'loyalty', 'reports', 'feedback'];
    
    for (let table of tables) {
      console.log(`\n--- TABLE: ${table} ---`);
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
        console.table(columns.map(c => ({
          Field: c.Field,
          Type: c.Type,
          Null: c.Null,
          Key: c.Key,
          Default: c.Default,
          Extra: c.Extra
        })));
      } catch (err) {
        console.error(`Table ${table} does not exist or error:`, err.message);
      }
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await pool.end();
  }
}

inspect();
