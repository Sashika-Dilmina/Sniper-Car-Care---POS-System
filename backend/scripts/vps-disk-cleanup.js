const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

if (!host || !username || !password) {
  console.error('❌ Error: Deployment credentials are missing in backend/.env file!');
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
    console.log(`\n>>> Executing command: ${cmd}`);
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
    console.log(`Uploading ${localPath} -> ${remotePath}...`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        sftp.end();
        if (err) return reject(err);
        console.log(`Uploaded successfully!`);
        resolve();
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('⚡ Connected to VPS via SSH');
  try {
    console.log('--- BEFORE CLEANUP DISK USAGE ---');
    await executeCommand(conn, 'df -h /');

    console.log('\n🧹 1. Clearing PM2 logs...');
    await executeCommand(conn, 'pm2 flush');

    console.log('\n🧹 2. Vacuuming system logs and clearing nginx logs...');
    await executeCommand(conn, 'journalctl --vacuum-time=1d || true');
    await executeCommand(conn, 'truncate -s 0 /var/log/nginx/*.log || true');

    console.log('\n🧹 3. Deleting ANPR camera images older than 1 day in uploads folder...');
    const cleanupCmd = `find ~/Sniper-Car-Care---POS-System/backend/uploads -maxdepth 1 -type f \\( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \\) ! -name "service_*" ! -name "*-saloon*" ! -name "*-4x4*" -mtime +1 -delete || true`;
    await executeCommand(conn, cleanupCmd);

    console.log('\n🧹 4. Pruning Docker / APT caches...');
    await executeCommand(conn, 'docker system prune -f || true');
    await executeCommand(conn, 'apt-get clean || true');

    console.log('\n📦 5. Uploading updated anprWatcher.js with 24-hour auto-cleanup routine...');
    const localWatcherPath = path.resolve(__dirname, '../services/anprWatcher.js');
    const remoteWatcherPath = '/root/Sniper-Car-Care---POS-System/backend/services/anprWatcher.js';
    await uploadFile(conn, localWatcherPath, remoteWatcherPath);

    console.log('\n🔄 6. Restarting PM2 backend service...');
    await executeCommand(conn, 'pm2 restart all || pm2 start /root/Sniper-Car-Care---POS-System/backend/server.js');

    console.log('\n--- AFTER CLEANUP DISK USAGE ---');
    await executeCommand(conn, 'df -h /');

    console.log('\n✅ VPS DISK CLEANUP & ANPR AUTO-DELETE DEPLOYMENT COMPLETED!');
  } catch (err) {
    console.error('❌ Disk cleanup / deployment failed:', err);
  } finally {
    conn.end();
  }
}).connect(config);
