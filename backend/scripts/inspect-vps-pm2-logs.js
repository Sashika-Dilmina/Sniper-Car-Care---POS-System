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
  console.log('⚡ Connected to VPS. Fetching PM2 error log...\n');
  
  const cmd = `
    echo "=== PM2 ERR LOG ==="
    tail -n 50 /root/.pm2/logs/sniper-backend-error-0.log
    
    echo -e "\n=== DIRECT NODE START TEST ==="
    cd /root/Sniper-Car-Care---POS-System/backend
    node server.js
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => process.stdout.write(d.toString()))
      .stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
}).connect(config);
