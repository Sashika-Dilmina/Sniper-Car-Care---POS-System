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
const { parsePlateComponents } = require('/root/Sniper-Car-Care---POS-System/backend/utils/customerLinkUtils');

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
    
    // Find customers without vehicle records or where vehicles table needs sync
    const [custs] = await conn.query("SELECT id, name, vehicle_plate FROM customers");
    console.log('Total customers in DB:', custs.length);
    
    let unsyncedCount = 0;
    for (const c of custs) {
      if (!c.vehicle_plate) continue;
      
      const [vehs] = await conn.query("SELECT CustomerId FROM vehicles WHERE CustomerId = ?", [c.id]);
      if (vehs.length === 0) {
        unsyncedCount++;
        const { plateCode, emirate, plateNumber } = parsePlateComponents(c.vehicle_plate);
        console.log('Unsynced customer:', c.id, c.name, 'plate:', c.vehicle_plate, '-> parsed:', { plateCode, emirate, plateNumber });
        
        if (plateNumber) {
          await conn.query(
            "INSERT INTO vehicles (CustomerId, PlateNumber, PlateCode, Emirate, VehicleRegistrationNumber) VALUES (?, ?, ?, ?, ?)",
            [c.id, plateNumber, plateCode, emirate, c.vehicle_plate]
          );
        }
      }
    }
    console.log('Unsynced/Created vehicle rows:', unsyncedCount);
    
    await conn.end();
    console.log('SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { conn.end(); return; }
    const writeStream = sftp.createWriteStream('/tmp/check_sync.js');
    writeStream.on('close', () => {
      conn.exec('node /tmp/check_sync.js && rm -f /tmp/check_sync.js', (err, stream) => {
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
