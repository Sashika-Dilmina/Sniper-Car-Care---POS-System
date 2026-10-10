const pool = require('./config/database');

async function checkProducts() {
  try {
    const [rows] = await pool.query('SELECT id, name, category, vehicle_type, price, is_active, is_deleted FROM products');
    console.log("=== ALL PRODUCTS IN DB ===");
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkProducts();
