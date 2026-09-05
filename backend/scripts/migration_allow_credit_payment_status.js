const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const conn = new Client();
conn.on('ready', () => {
  const sql = "ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'pending'; DESCRIBE orders;";

  conn.exec(`mysql -u root -p123456 sniper_car_care -e "${sql}"`, (err, stream) => {
    if (err) {
      console.error('SSH Error:', err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      console.log('\n✅ Migration completed successfully.');
    });
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
