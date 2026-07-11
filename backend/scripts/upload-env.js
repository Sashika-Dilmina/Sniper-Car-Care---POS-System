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

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`\n📤 Uploading: ${path.basename(localPath)} -> ${remotePath}...`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        sftp.end();
        if (err) return reject(err);
        console.log(`✅ Upload complete: ${path.basename(localPath)}`);
        resolve();
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('⚡ Connected to Hostinger VPS via SSH');
  try {
    const localEnv = path.resolve(__dirname, '../.env');
    const remoteEnv = '/root/Sniper-Car-Care---POS-System/backend/.env';

    // Upload local .env to VPS
    await uploadFile(conn, localEnv, remoteEnv);

    // Restart backend PM2 to load new keys
    console.log('🔄 Restarting backend PM2 to apply new keys...');
    const restartRes = await executeCommand(conn, 'pm2 restart all');
    if (restartRes.code !== 0) throw new Error('PM2 restart failed');

    console.log('\n🎉 ================================================');
    console.log('🎉 LIVE ENV KEYS DEPLOYED & RESTARTED SUCCESSFULLY!');
    console.log('🎉 ================================================');

  } catch (err) {
    console.error('\n❌ Upload failed:', err.message);
  } finally {
    conn.end();
  }
}).connect(config);
