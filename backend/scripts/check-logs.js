const { Client } = require('ssh2');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

if (!host || !username || !password) {
  console.error('❌ Error: Deployment credentials missing in backend/.env!');
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

function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n🤖 VPS executing: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code, signal) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('⚡ Connected to Hostinger VPS via SSH');
  try {
    console.log('\n--- Checking PM2 Processes Status ---');
    await executeCommand(conn, 'pm2 status');

    console.log('\n--- Checking PM2 Backend logs (Last 30 lines) ---');
    await executeCommand(conn, 'pm2 logs sniper-backend --lines 30 --nostream');
    
  } catch (err) {
    console.error('\n❌ Logging failed:', err.message);
  } finally {
    conn.end();
  }
}).connect(config);
