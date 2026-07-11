const pool = require('../config/database');

async function checkCategories() {
  try {
    const [rows] = await pool.query('SELECT category, COUNT(*) as count FROM products GROUP BY category');
    console.log('Categories and counts in products table:');
    console.table(rows);
  } catch (err) {
    console.error('Failed to get categories:', err);
  } finally {
    await pool.end();
  }
}

checkCategories();
