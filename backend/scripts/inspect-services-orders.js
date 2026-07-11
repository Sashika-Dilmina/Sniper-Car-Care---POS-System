const pool = require('../config/database');

async function inspect() {
  try {
    const tables = ['services', 'orders', 'products'];
    for (let table of tables) {
      console.log(`\n--- TABLE: ${table} ---`);
      const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
      columns.forEach(c => {
        console.log(`Field: ${c.Field}, Type: ${c.Type}, Null: ${c.Null}, Key: ${c.Key}, Default: ${c.Default}`);
      });
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await pool.end();
  }
}

inspect();
