const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 logs sniper-backend --lines 50 --nostream', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: process.env.DEPLOY_HOST || '72.62.254.128',
  port: 22,
  username: process.env.DEPLOY_USER || 'root',
  password: process.env.DEPLOY_PASS || 'GrTKf/W@3U6Ur.KT'
});
