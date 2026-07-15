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
    console.log('⚡ Connected to VPS database.');

    // 1. Update vip_services prices
    const [res1] = await conn.query(
      "UPDATE vip_services SET price = 95.00 WHERE name = 'Saloon VIP Service'"
    );
    console.log('✅ Updated Saloon VIP Service in vip_services:', res1.affectedRows, 'rows.');

    const [res2] = await conn.query(
      "UPDATE vip_services SET price = 115.00 WHERE name = '4x4 VIP Service'"
    );
    console.log('✅ Updated 4x4 VIP Service in vip_services:', res2.affectedRows, 'rows.');

    // 2. Update products table for POS sells dashboard
    const [res3] = await conn.query(
      "UPDATE products SET price = 95.00 WHERE name LIKE '%Saloon VIP%'"
    );
    console.log('✅ Updated Saloon VIP products in products:', res3.affectedRows, 'rows.');

    const [res4] = await conn.query(
      "UPDATE products SET price = 115.00 WHERE name LIKE '%4x4 VIP%' OR name LIKE '%4*4 VIP%'"
    );
    console.log('✅ Updated 4x4 VIP products in products:', res4.affectedRows, 'rows.');

    // Print current values to verify
    const [vipServices] = await conn.query("SELECT * FROM vip_services");
    console.log('--- Current vip_services values ---');
    console.table(vipServices);

    const [vipProducts] = await conn.query("SELECT id, name, price, category FROM products WHERE category = 'VIP' OR name LIKE '%VIP%'");
    console.log('--- Current VIP products values ---');
    console.table(vipProducts);

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
    
    const stream = sftp.createWriteStream('/tmp/update_vip_prices.js');
    stream.on('close', () => {
      conn.exec('cd /root/Sniper-Car-Care---POS-System/backend && node /tmp/update_vip_prices.js && rm -f /tmp/update_vip_prices.js', (err, stream) => {
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
