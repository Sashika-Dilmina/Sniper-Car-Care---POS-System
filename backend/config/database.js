const mysql = require('mysql2/promise');
require('dotenv').config();

// Handle password properly - empty string means no password
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';

// Build connection config - omit password property if it's empty
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'sniper_car_care',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Only add password if it's not empty (some MySQL setups reject empty string in pools)
if (dbPassword && dbPassword.trim() !== '') {
  poolConfig.password = dbPassword;
}

const pool = mysql.createPool(poolConfig);

// Set session time zone to UAE time (+04:00) for all database operations
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+04:00';", (err) => {
    if (err) {
      console.error('Error setting time zone:', err);
    }
  });
});

// Test database connection
setTimeout(() => {
  pool.getConnection()
    .then(connection => {
      console.log('✅ Database connected successfully');
      connection.release();
    })
    .catch(err => {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('❌ Database connection error: Access denied');
        console.error('');
        console.error('💡 SOLUTION: Your MySQL root user requires a password.');
        console.error('');
        console.error('   Option 1: If MySQL has NO password, update backend/.env:');
        console.error('             DB_PASSWORD=');
        console.error('');
        console.error('   Option 2: If MySQL HAS a password, update backend/.env:');
        console.error('             DB_PASSWORD=your_actual_mysql_password');
        console.error('');
        console.error('   Option 3: Test connection manually:');
        console.error('             node test-db-connection.js');
        console.error('');
        console.error('   Option 4: Reset MySQL password (see DATABASE_CONNECTION_FIX.md)');
      } else {
        console.error('❌ Database connection error:', err.message);
      }
    });
}, 100);

module.exports = pool;

