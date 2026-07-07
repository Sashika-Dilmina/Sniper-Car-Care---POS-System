const pool = require('../config/database');

async function checkUsers() {
  try {
    const [users] = await pool.query('SELECT id, name, email, role FROM users');
    console.log('👥 Current Users in Database:');
    console.log(users);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking users:', error);
    process.exit(1);
  }
}

checkUsers();
