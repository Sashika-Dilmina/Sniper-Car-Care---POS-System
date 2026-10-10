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
    
    console.log('Running ALTER query on anpr_logs table...');
    const [res] = await conn.query("ALTER TABLE anpr_logs MODIFY plate_number VARCHAR(100) NOT NULL;");
    console.log('Migration executed successfully.');
    
    await conn.end();
    console.log('SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('Error running migration on VPS database:', err.message);
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
    
    const stream = sftp.createWriteStream('/tmp/alter_anpr_logs.js');
    stream.on('close', () => {
      console.log('Uploaded migration script to VPS.');
      conn.exec('node /tmp/alter_anpr_logs.js && rm -f /tmp/alter_anpr_logs.js', (err, stream) => {
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
