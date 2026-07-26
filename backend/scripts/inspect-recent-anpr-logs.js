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
    
    const [rows] = await conn.query(
      "SELECT l.id, l.plate_number, l.customer_id, c.name as customer_name, c.phone as customer_phone, l.created_at FROM anpr_logs l LEFT JOIN customers c ON l.customer_id = c.id WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY l.id DESC LIMIT 30"
    );
    console.log(JSON.stringify(rows, null, 2));
    
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
    const writeStream = sftp.createWriteStream('/tmp/inspect_recent_logs.js');
    writeStream.on('close', () => {
      conn.exec('node /tmp/inspect_recent_logs.js && rm -f /tmp/inspect_recent_logs.js', (err, stream) => {
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
