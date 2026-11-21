const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`curl -s "http://localhost:5000/api/analytics/dashboard?start_date=2026-07-28&end_date=2026-07-28"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data.toString());
    }).stderr.on('data', (data) => {
      console.error('STDERR:\n' + data.toString());
    });
  });
}).connect({
  host: process.env.DEPLOY_HOST || '72.62.254.128',
  port: 22,
  username: process.env.DEPLOY_USER || 'root',
  password: process.env.DEPLOY_PASS || 'GrTKf/W@3U6Ur.KT'
});
