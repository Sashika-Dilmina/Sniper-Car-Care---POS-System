const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sniper_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function inspect() {
  try {
    console.log('⚡ Querying VPS database for customer plate records...');
    
    const [customers] = await pool.query(`
      SELECT id, name, phone, vehicle_plate, vehicle_type 
      FROM customers 
      ORDER BY id DESC LIMIT 15
    `);
    
    console.log('\n👤 Recent Customers in Database:');
    console.table(customers);

    const [vehicles] = await pool.query(`
      SELECT VehicleId, CustomerId, PlateNumber, PlateCode, Emirate 
      FROM vehicles 
      ORDER BY VehicleId DESC LIMIT 15
    `);
    
    console.log('\n🚗 Recent Vehicles in Database:');
    console.table(vehicles);

    await pool.end();
  } catch (err) {
    console.error('❌ Database error:', err);
  }
}

inspect();
