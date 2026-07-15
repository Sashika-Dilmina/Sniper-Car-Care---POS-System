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
    
    // Query categories and counts in products table on VPS
    const [rows] = await conn.query('SELECT category, COUNT(*) as count FROM products GROUP BY category');
    console.log('--- Categories and counts on VPS ---');
    console.table(rows);

    // Query all products in products table on VPS
    const [products] = await conn.query('SELECT id, name, price, category FROM products');
    console.log('--- All products on VPS ---');
    console.table(products);

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
    
    const stream = sftp.createWriteStream('/tmp/inspect_vps_names.js');
    stream.on('close', () => {
      conn.exec('cd /root/Sniper-Car-Care---POS-System/backend && node /tmp/inspect_vps_names.js && rm -f /tmp/inspect_vps_names.js', (err, stream) => {
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
