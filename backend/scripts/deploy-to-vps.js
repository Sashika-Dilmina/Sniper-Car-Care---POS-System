const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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
    const repoPath = '/root/Sniper-Car-Care---POS-System';
    const rootDir = path.resolve(__dirname, '../..');

    // 1. Pull backend/code changes on VPS via git
    console.log('\n📦 Pulling latest code changes on VPS...');
    const pullRes = await executeCommand(conn, `cd ${repoPath} && git fetch --all && git reset --hard origin/ravix`);
    if (pullRes.code !== 0) throw new Error('Git pull failed');

    // 2. Install backend dependencies, run performance migrations, update Nginx & restart Node app
    console.log('\n⚙️ Updating backend dependencies, running DB performance indexes & updating server settings...');
    const backendRes = await executeCommand(
      conn, 
      `cd ${repoPath} && mysql -u root -p123456 sniper_car_care < database/migration_performance_indexes.sql || true && mysql -u root -p123456 sniper_car_care < database/migration_performance_v3.sql || true && cp nginx-sites.conf /etc/nginx/sites-available/default && nginx -t && systemctl reload nginx || true && cd backend && npm install && pm2 restart all`
    );
    if (backendRes.code !== 0) throw new Error('Backend update/restart failed');

    // 3. Build frontends locally
    console.log('\n🛠️ Building POS Dashboard locally...');
    execSync('npm run build', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });
    execSync('tar -czf ../frontend.tar.gz -C dist .', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

    console.log('\n💇 Building Saloon Website locally...');
    execSync('npm run build', { cwd: path.join(rootDir, 'customer-website-saloon'), stdio: 'inherit' });
    execSync('tar -czf ../saloon.tar.gz -C dist .', { cwd: path.join(rootDir, 'customer-website-saloon'), stdio: 'inherit' });

    console.log('\n🚗 Building 4x4 Website locally...');
    execSync('npm run build', { cwd: path.join(rootDir, 'customer-website-4x4'), stdio: 'inherit' });
    execSync('tar -czf ../4x4.tar.gz -C dist .', { cwd: path.join(rootDir, 'customer-website-4x4'), stdio: 'inherit' });

    // 4. Upload build bundles to VPS
    await uploadFile(conn, path.join(rootDir, 'frontend.tar.gz'), '/tmp/frontend.tar.gz');
    await uploadFile(conn, path.join(rootDir, 'saloon.tar.gz'), '/tmp/saloon.tar.gz');
    await uploadFile(conn, path.join(rootDir, '4x4.tar.gz'), '/tmp/4x4.tar.gz');

    // 5. Extract build bundles on VPS
    console.log('\n📦 Extracting assets on VPS...');
    await executeCommand(conn, 'mkdir -p /var/www/pos-dashboard /var/www/customer-saloon /var/www/customer-4x4');
    
    const extract1 = await executeCommand(conn, 'tar -xzf /tmp/frontend.tar.gz -C /var/www/pos-dashboard');
    if (extract1.code !== 0) throw new Error('Extract POS dashboard failed');
    
    const extract2 = await executeCommand(conn, 'tar -xzf /tmp/saloon.tar.gz -C /var/www/customer-saloon');
    if (extract2.code !== 0) throw new Error('Extract Saloon failed');
    
    const extract3 = await executeCommand(conn, 'tar -xzf /tmp/4x4.tar.gz -C /var/www/customer-4x4');
    if (extract3.code !== 0) throw new Error('Extract 4x4 failed');

    // 6. Clean up temporary files on local and remote
    console.log('\n🧹 Cleaning up temporary archives...');
    await executeCommand(conn, 'rm -f /tmp/frontend.tar.gz /tmp/saloon.tar.gz /tmp/4x4.tar.gz');
    
    fs.unlinkSync(path.join(rootDir, 'frontend.tar.gz'));
    fs.unlinkSync(path.join(rootDir, 'saloon.tar.gz'));
    fs.unlinkSync(path.join(rootDir, '4x4.tar.gz'));

    console.log('\n🎉 ================================================');
    console.log('🎉 VPS DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log('🎉 ================================================');

  } catch (err) {
    console.error('\n❌ Deployment failed:', err.message);
  } finally {
    conn.end();
  }
}).connect(config);
