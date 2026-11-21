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
    
    const [customers] = await conn.query(
      "SELECT id, name, phone, vehicle_plate, vehicle_type, last_seen FROM customers WHERE name LIKE '%niroshan%' OR name LIKE '%Niroshan%'"
    );
    console.log('Customer matching Niroshan:');
    console.log(JSON.stringify(customers, null, 2));
    
    if (customers.length > 0) {
      const ids = customers.map(c => c.id);
      const [vehicles] = await conn.query(
        "SELECT * FROM vehicles WHERE CustomerId IN (?)",
        [ids]
      );
      console.log('Vehicles:');
      console.log(JSON.stringify(vehicles, null, 2));
      
      const [logs] = await conn.query(
        "SELECT * FROM anpr_logs WHERE customer_id IN (?) OR plate_number LIKE '%77675%' ORDER BY id DESC LIMIT 10",
        [ids]
      );
      console.log('ANPR logs relating to Niroshan:');
      console.log(JSON.stringify(logs, null, 2));
    }
    
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
    const writeStream = sftp.createWriteStream('/tmp/inspect_niroshan_short.js');
    writeStream.on('close', () => {
      conn.exec('node /tmp/inspect_niroshan_short.js && rm -f /tmp/inspect_niroshan_short.js', (err, stream) => {
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
