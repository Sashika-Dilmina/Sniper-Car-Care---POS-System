const { Client } = require('ssh2');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

if (!host || !username || !password) {
  console.error('❌ Credentials missing in backend/.env');
  process.exit(1);
}

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
    console.log('Connected to VPS database.');
    
    // Find all payments with method = 'free'
    const [rows1] = await conn.query("SELECT p.*, o.discount, o.total, o.payment_status, o.status as order_status FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.method = 'free'");
    console.log('--- Free Method Payments ---');
    console.log(JSON.stringify(rows1, null, 2));

    // Find all orders with payment_status = 'free'
    const [rows2] = await conn.query("SELECT id, customer_id, total, discount, payment_status, status FROM orders WHERE payment_status = 'free'");
    console.log('--- Free Payment Status Orders ---');
    console.log(JSON.stringify(rows2, null, 2));

    await conn.end();
    console.log('SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
run();
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    
    const stream = sftp.createWriteStream('/tmp/inspect_vps_free.js');
    stream.on('close', () => {
      conn.exec('cd /root/Sniper-Car-Care---POS-System/backend && node /tmp/inspect_vps_free.js && rm -f /tmp/inspect_vps_free.js', (err, stream) => {
        if (err) {
          console.error(err);
          conn.end();
          return;
        }
        stream.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
    stream.write(scriptContent);
    stream.end();
  });
}).connect(config);
