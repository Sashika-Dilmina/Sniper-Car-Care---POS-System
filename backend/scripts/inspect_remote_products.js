const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  host: process.env.DEPLOY_HOST,
  port: parseInt(process.env.DEPLOY_PORT || '22'),
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS,
  readyTimeout: 60000
};

const conn = new Client();

conn.on('ready', () => {
  console.log('⚡ Connected to VPS');
  const sql = "SELECT id, name, category, vehicle_type, price, is_active, is_deleted FROM products;";
  const cmd = `mysql -u root -p123456 sniper_car_care -e "${sql}"`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
