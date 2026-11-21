const pool = require('../config/database');

async function fixPastTimestamps() {
  console.log('🔍 Fixing timezone offsets on past service timestamps and resetting non-product stock...');

  try {
    // 1. Reset stock for all non-product items to 999
    const [stockRes] = await pool.query(`
      UPDATE products 
      SET stock = 999 
      WHERE category != 'Products'
    `);
    console.log(`✅ Reset stock for ${stockRes.affectedRows} non-product items (Services, VIP, Extra Services) to 999.`);

    // 2. Fix order service_started_at timestamps where started_at was recorded ahead of created_at / completed_at due to Node.js timezone offsets
    const [ordersRes] = await pool.query(`
      UPDATE orders 
      SET service_started_at = created_at 
      WHERE service_started_at IS NOT NULL 
        AND (service_started_at > created_at + INTERVAL 10 MINUTE OR (service_completed_at IS NOT NULL AND service_started_at > service_completed_at))
    `);
    console.log(`✅ Fixed timezone offset on ${ordersRes.affectedRows} orders in 'orders' table.`);

    // 3. Fix services started_at timestamps
    const [servicesRes] = await pool.query(`
      UPDATE services 
      SET started_at = created_at 
      WHERE started_at IS NOT NULL 
        AND (started_at > created_at + INTERVAL 10 MINUTE OR (completed_at IS NOT NULL AND started_at > completed_at))
    `);
    console.log(`✅ Fixed timezone offset on ${servicesRes.affectedRows} services in 'services' table.`);

    console.log('🎉 Timestamp cleanup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing past timestamps:', err);
    process.exit(1);
  }
}

fixPastTimestamps();
