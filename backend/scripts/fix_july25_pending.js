const pool = require('../config/database');

async function fixJuly25Pending() {
  console.log('🔍 Checking and cleaning up July 25 pending orders and orphaned services...');

  try {
    // 1. Complete any orphaned services belonging to completed orders
    const [orphanedRes] = await pool.query(`
      UPDATE services s
      JOIN orders o ON s.order_id = o.id
      SET s.status = 'completed',
          s.completed_at = COALESCE(s.completed_at, o.service_completed_at, o.updated_at, CURRENT_TIMESTAMP),
          s.started_at = COALESCE(s.started_at, o.service_started_at, o.created_at, CURRENT_TIMESTAMP)
      WHERE o.status = 'completed' AND s.status IN ('pending', 'in_progress')
    `);
    console.log(`✅ Updated ${orphanedRes.affectedRows} orphaned services belonging to completed orders to status 'completed'.`);

    // 2. Complete any pending/processing orders created on or before July 25
    const [oldOrdersRes] = await pool.query(`
      UPDATE orders
      SET status = 'completed',
          service_completed_at = COALESCE(service_completed_at, updated_at, CURRENT_TIMESTAMP),
          service_started_at = COALESCE(service_started_at, created_at, CURRENT_TIMESTAMP)
      WHERE DATE(created_at) <= '2026-07-25' AND status IN ('pending', 'processing')
    `);
    console.log(`✅ Updated ${oldOrdersRes.affectedRows} pending/processing orders from July 25 or earlier to 'completed'.`);

    // 3. Complete services attached to those July 25 or earlier orders
    const [oldServicesRes] = await pool.query(`
      UPDATE services s
      JOIN orders o ON s.order_id = o.id
      SET s.status = 'completed',
          s.completed_at = COALESCE(s.completed_at, o.service_completed_at, o.updated_at, CURRENT_TIMESTAMP),
          s.started_at = COALESCE(s.started_at, o.service_started_at, o.created_at, CURRENT_TIMESTAMP)
      WHERE DATE(o.created_at) <= '2026-07-25' AND s.status IN ('pending', 'in_progress')
    `);
    console.log(`✅ Updated ${oldServicesRes.affectedRows} services from July 25 or earlier to 'completed'.`);

    console.log('🎉 Cleanup complete! Cash register should now close without errors.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing pending orders:', error);
    process.exit(1);
  }
}

fixJuly25Pending();
