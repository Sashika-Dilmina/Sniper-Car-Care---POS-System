const { Client } = require('ssh2');
const fs = require('fs');
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
  conn.exec('cat /etc/nginx/sites-available/sniper-car-care', (err, stream) => {
    if (err) throw err;
    let stdout = '';
    stream.on('close', () => {
      const outputPath = path.join(__dirname, 'remote_nginx.conf');
      fs.writeFileSync(outputPath, stdout);
      console.log('Successfully wrote remote Nginx config to ' + outputPath);
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
