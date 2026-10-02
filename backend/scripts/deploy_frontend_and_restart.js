const { Client } = require('ssh2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const conn = new Client();

function executeCommand(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
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

function uploadFile(sftp, localFile, remoteFile) {
  return new Promise((resolve, reject) => {
    console.log(`Uploading ${localFile} -> ${remoteFile}...`);
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) return reject(err);
      console.log(`Uploaded ${path.basename(localFile)} successfully!`);
      resolve();
    });
  });
}

conn.on('ready', async () => {
  console.log('⚡ Connected to VPS SSH');
  try {
    // 1. Git pull latest code on VPS
    console.log('\n--- Step 1: Git Pull on VPS ---');
    await executeCommand('cd /root/Sniper-Car-Care---POS-System && git fetch origin && git checkout ravix && git pull origin ravix && git log -n 1 --oneline');

    // 2. Upload frontend_dist.tar.gz via SFTP
    console.log('\n--- Step 2: Uploading built dist archive ---');
    await new Promise((resolve, reject) => {
      conn.sftp(async (err, sftp) => {
        if (err) return reject(err);
        try {
          const rootDir = path.join(__dirname, '../../');
          await uploadFile(sftp, path.join(rootDir, 'frontend_dist.tar.gz'), '/tmp/frontend_dist.tar.gz');
          resolve();
        } catch (uploadErr) {
          reject(uploadErr);
        }
      });
    });

    // 3. Extract to /var/www/pos-dashboard
    console.log('\n--- Step 3: Extracting to /var/www/pos-dashboard ---');
    await executeCommand('mkdir -p /var/www/pos-dashboard && rm -rf /var/www/pos-dashboard/* && tar -xzf /tmp/frontend_dist.tar.gz -C /var/www/pos-dashboard/ && ls -la /var/www/pos-dashboard');

    // 4. Restart PM2 backend
    console.log('\n--- Step 4: Restarting PM2 backend ---');
    await executeCommand('pm2 restart sniper-backend');
    await executeCommand('pm2 status sniper-backend');

    // 5. Cleanup temporary archive on VPS
    console.log('\n--- Step 5: Cleaning up temp files on VPS ---');
    await executeCommand('rm -f /tmp/frontend_dist.tar.gz');

    console.log('\n✅ Deployment to VPS completed successfully!');
  } catch (err) {
    console.error('Deployment Error:', err);
  } finally {
    conn.end();
  }
}).connect({
  host: process.env.DEPLOY_HOST,
  port: 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
