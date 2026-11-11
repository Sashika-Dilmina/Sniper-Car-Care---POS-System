const { Client } = require('ssh2');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

const config = {
  host,
  port: parseInt(process.env.DEPLOY_PORT || '22'),
  username,
  password,
  readyTimeout: 60000
};

const conn = new Client();

const scriptContent = `
const mysql = require('/root/Sniper-Car-Care---POS-System/backend/node_modules/mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '123456',
      database: 'sniper_car_care',
      port: 3306
    });
    console.log('Connected.');
    
    // Check orders 415, 403, 397
    const [orders] = await conn.query("SELECT id, status, payment_status, total FROM orders WHERE id IN (415, 403, 397)");
    console.log('Orders in database:', orders);
    
    // Check customer credits for these order IDs
    const [credits] = await conn.query("SELECT * FROM customer_credits WHERE order_id IN (415, 403, 397)");
    console.log('Credits in database:', credits);
    
    await conn.end();
  } catch (err) {
    console.error(err);
  }
}
run();
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { conn.end(); return; }
    const writeStream = sftp.createWriteStream('/tmp/check_credits_status.js');
    writeStream.on('close', () => {
      conn.exec('node /tmp/check_credits_status.js', (err, stream) => {
        if (err) { conn.end(); return; }
        stream.on('close', () => conn.end())
              .on('data', (d) => process.stdout.write(d.toString()))
              .stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    });
    writeStream.write(scriptContent);
    writeStream.end();
  });
}).connect(config);
