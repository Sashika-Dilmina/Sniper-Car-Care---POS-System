const { Client } = require('ssh2');
require('dotenv').config();

const conn = new Client();
conn.on('ready', () => {
  conn.exec("node -e \"const pool = require('/root/Sniper-Car-Care---POS-System/backend/config/database'); pool.query('SELECT * FROM feedback').then(([r]) => console.log('FEEDBACK_ROWS:', JSON.stringify(r))).catch(e => console.error(e)).finally(() => process.exit());\"", (err, stream) => {
    stream.on('close', () => conn.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
