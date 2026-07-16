const { Client } = require('ssh2');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

if (!host || !username || !password) {
  console.error('❌ Error: Deployment credentials missing in backend/.env!');
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

const remoteScript = `
const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspectUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sniper_car_care',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('\\n--- USERS IN LIVE VPS DATABASE ---');
    const [rows] = await connection.query('SELECT id, name, email, role, password FROM users');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

inspectUsers();
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const writeStream = sftp.createWriteStream('/root/Sniper-Car-Care---POS-System/backend/inspectUsers.js');
    writeStream.on('close', () => {
      conn.exec('cd /root/Sniper-Car-Care---POS-System/backend && node inspectUsers.js', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          conn.exec('rm -f /root/Sniper-Car-Care---POS-System/backend/inspectUsers.js', () => {
            conn.end();
          });
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
    writeStream.write(remoteScript);
    writeStream.end();
  });
}).connect(config);
