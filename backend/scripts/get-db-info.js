const pool = require('../config/database');

async function run() {
  try {
    const [categories] = await pool.query('SELECT DISTINCT category FROM products');
    console.log('Categories in products table:', categories);

    const [vipServices] = await pool.query('SELECT * FROM vip_services');
    console.log('Services in vip_services table:', vipServices);

    const [vipProducts] = await pool.query('SELECT * FROM products WHERE category = "VIP"');
    console.log('Products in products table with category "VIP":', vipProducts);

    process.exit(0);
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

run();
