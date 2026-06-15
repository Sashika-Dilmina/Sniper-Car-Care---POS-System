const { Client } = require('ssh2');
const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

if (!host || !username || !password) {
  console.error('❌ Error: Deployment credentials are missing in backend/.env file!');
  console.error('Please make sure DEPLOY_HOST, DEPLOY_USER, and DEPLOY_PASS are set in backend/.env.');
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
conn.on('ready', () => {
  conn.exec('ls -la ~/Sniper-Car-Care---POS-System/backend/uploads', (err, stream) => {
    if (err) throw err;
    let stdout = '';
    let stderr = '';
    stream.on('close', (code) => {
      console.log('Exit Code:', code);
      console.log('STDOUT:\n', stdout);
      console.log('STDERR:\n', stderr);
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    }).stderr.on('data', (data) => {
      stderr += data.toString();
    });
  });
}).connect(config);
