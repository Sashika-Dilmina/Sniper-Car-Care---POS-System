const { Client } = require('ssh2');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

const config = {
  host,
  port: parseInt(process.env.DEPLOY_PORT || '22'),
  username,
  password,
  readyTimeout: 60000
};

const conn = new Client();

const scriptContent = `
const fs = require('fs');
const outLogPath = '/root/.pm2/logs/sniper-backend-out.log';

if (fs.existsSync(outLogPath)) {
  const lines = fs.readFileSync(outLogPath, 'utf8').split('\\n');
  const start = Math.max(0, 503080);
  const end = Math.min(lines.length, 503150);
  console.log('--- LOG LINES ' + start + ' TO ' + end + ' ---');
  for (let i = start; i < end; i++) {
    console.log(i + ': ' + lines[i]);
  }
} else {
  console.log('Log file not found');
}
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { conn.end(); return; }
    const writeStream = sftp.createWriteStream('/tmp/inspect_log_lines.js');
    writeStream.on('close', () => {
      conn.exec('node /tmp/inspect_log_lines.js && rm -f /tmp/inspect_log_lines.js', (err, stream) => {
        if (err) { conn.end(); return; }
        stream.on('close', () => conn.end())
              .on('data', (d) => process.stdout.write(d.toString()))
              .stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    });
    writeStream.write(scriptContent);
    writeStream.end();
  });
}).connect(config);
