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
    
    // Update image url for saloon Full Body Service
    const [res1] = await conn.query("UPDATE products SET image_url = '/uploads/full-service-saloon.jpg' WHERE name = 'Full Body Service' AND vehicle_type = 'Saloon'");
    console.log('Saloon image updated:', res1.affectedRows);
    
    // Update image url for 4x4 Full Body Wash
    const [res2] = await conn.query("UPDATE products SET image_url = '/uploads/full-service-4x4.jpg' WHERE name = 'Full Body Wash' AND vehicle_type = '4x4'");
    console.log('4x4 image updated:', res2.affectedRows);
    
    await conn.end();
    console.log('SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('Error running update on VPS database:', err.message);
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
    
    const stream = sftp.createWriteStream('/tmp/image_update.js');
    stream.on('close', () => {
      console.log('Uploaded image update script to VPS.');
      conn.exec('cd /root/Sniper-Car-Care---POS-System/backend && node /tmp/image_update.js && rm -f /tmp/image_update.js', (err, stream) => {
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
