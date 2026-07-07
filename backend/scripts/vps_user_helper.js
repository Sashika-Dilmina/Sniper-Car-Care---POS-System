const { Client } = require('ssh2');
require('dotenv').config();

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  
  // Navigate to project directory, run node scripts/reset-admin.js, and output result
  const cmd = [
    'cd /root/Sniper-Car-Care---POS-System/backend',
    'node scripts/reset-admin.js',
    'node -e "const mysql = require(\'mysql2/promise\'); require(\'dotenv\').config(); mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }).then(async conn => { const [rows] = await conn.query(\'SELECT id, name, email, role FROM users\'); console.log(\'VPS users in DB:\', rows); await conn.end(); })"'
  ].join(' && ');
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let stdout = '';
    stream.on('close', (code) => {
      console.log('Setup command finished with code: ' + code);
      console.log('OUTPUT:\n' + stdout);
      conn.end();
    }).on('data', (data) => {
      stdout += data;
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: parseInt(process.env.DEPLOY_PORT) || 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
