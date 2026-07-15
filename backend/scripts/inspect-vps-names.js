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
    
    // Query order names resolution
    const [orders] = await conn.query(\`
      SELECT o.id, o.customer_id, o.vip_booking_id, o.total, o.status,
             c.name as main_cust_name, c.vehicle_plate as main_cust_plate,
             vc.name as vip_cust_name, vc.vehicle_model as vip_cust_plate
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
      LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
      WHERE o.id IN (260, 261, 262, 263, 264, 265)
    \`);
    console.log('--- Orders Customer Resolution ---');
    console.table(orders);

    // Query main customers table
    const [mainCusts] = await conn.query(\`
      SELECT id, name, phone, vehicle_plate, vehicle_type 
      FROM customers 
      WHERE vehicle_plate IN ('B Dubai 72838', '3 Ras Al Khaimah 6282')
    \`);
    console.log('--- main customers table ---');
    console.table(mainCusts);

    // Query vip_customers table
    const [vipCusts] = await conn.query(\`
      SELECT id, name, phone, vehicle_model, vehicle_type 
      FROM vip_customers 
      WHERE vehicle_model IN ('B Dubai 72838', '3 Ras Al Khaimah 6282')
    \`);
    console.log('--- vip_customers table ---');
    console.table(vipCusts);

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
