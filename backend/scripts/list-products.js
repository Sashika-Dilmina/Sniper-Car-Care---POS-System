const pool = require('../config/database');

async function listProducts() {
  try {
    const [rows] = await pool.query('SELECT id, name, category, price FROM products');
    console.log('Products List:');
    console.table(rows);
  } catch (err) {
    console.error('Failed to get products:', err);
  } finally {
    await pool.end();
  }
}

listProducts();
