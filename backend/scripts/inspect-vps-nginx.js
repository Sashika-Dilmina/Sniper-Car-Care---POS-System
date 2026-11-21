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
  console.log('⚡ Connected to VPS. Checking Nginx & API error logs...\n');
  
  const cmd = `
    echo "=== NGINX SITES ENABLED ==="
    ls -la /etc/nginx/sites-enabled/
    
    echo -e "\n=== NGINX CONFIG CONTENT ==="
    cat /etc/nginx/sites-available/* 2>/dev/null || cat /etc/nginx/sites-enabled/* 2>/dev/null
    
    echo -e "\n=== RECENT NGINX ERROR LOG ==="
    tail -n 20 /var/log/nginx/error.log 2>/dev/null
    
    echo -e "\n=== RECENT NGINX ACCESS LOG FOR /api ==="
    grep "/api" /var/log/nginx/access.log | tail -n 20 2>/dev/null
    
    echo -e "\n=== PM2 STATUS ==="
    pm2 status
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
