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

async function describe() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sniper_car_care',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('\\n--- PRODUCTS COLUMNS ---');
    const [cols] = await connection.query('SHOW COLUMNS FROM products');
    console.log(JSON.stringify(cols, null, 2));

    console.log('\\n--- SAMPLE ROW ---');
    const [rows] = await connection.query('SELECT * FROM products LIMIT 1');
    console.log(JSON.stringify(rows[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

describe();
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const writeStream = sftp.createWriteStream('/root/Sniper-Car-Care---POS-System/backend/describeProducts.js');
    writeStream.on('close', () => {
      conn.exec('cd /root/Sniper-Car-Care---POS-System/backend && node describeProducts.js', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          conn.exec('rm -f /root/Sniper-Car-Care---POS-System/backend/describeProducts.js', () => {
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
