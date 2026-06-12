const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '72.62.254.128',
  port: 22,
  username: 'root',
  password: 'GrTKf/W@3U6Ur.KT',
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
