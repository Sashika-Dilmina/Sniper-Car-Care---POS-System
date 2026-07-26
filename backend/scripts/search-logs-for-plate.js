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
const path = require('path');

function search() {
  const outLogPath = '/root/.pm2/logs/sniper-backend-out.log';
  const errLogPath = '/root/.pm2/logs/sniper-backend-error.log';
  const plate = '971504244211';
  
  console.log('Searching out logs for: ' + plate);
  if (fs.existsSync(outLogPath)) {
    const lines = fs.readFileSync(outLogPath, 'utf8').split('\\n');
    lines.forEach((line, index) => {
      if (line.includes(plate)) {
        console.log('out.log L' + index + ': ' + line);
      }
    });
  }
  
  console.log('Searching error logs for: ' + plate);
  if (fs.existsSync(errLogPath)) {
    const lines = fs.readFileSync(errLogPath, 'utf8').split('\\n');
    lines.forEach((line, index) => {
      if (line.includes(plate)) {
        console.log('error.log L' + index + ': ' + line);
      }
    });
  }
}
search();
`;

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { conn.end(); return; }
    const writeStream = sftp.createWriteStream('/tmp/search_logs_plate.js');
    writeStream.on('close', () => {
      conn.exec('node /tmp/search_logs_plate.js && rm -f /tmp/search_logs_plate.js', (err, stream) => {
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
