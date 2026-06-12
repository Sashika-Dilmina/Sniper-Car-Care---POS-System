const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '72.62.254.128',
  port: 22,
  username: 'root',
  password: 'GrTKf/W@3U6Ur.KT',
  readyTimeout: 60000
};

const conn = new Client();

function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`Executing remote command: ${cmd}`);
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
    // 1. Upload archives and migrations
    const rootDir = path.join(__dirname, '..', '..');
    await uploadFile(conn, path.join(rootDir, 'frontend.tar.gz'), '/tmp/frontend.tar.gz');
    await uploadFile(conn, path.join(rootDir, 'saloon.tar.gz'), '/tmp/saloon.tar.gz');
    await uploadFile(conn, path.join(rootDir, '4x4.tar.gz'), '/tmp/4x4.tar.gz');
    await uploadFile(conn, path.join(rootDir, 'database', 'migration_add_service_timestamps.sql'), '/tmp/migration_add_service_timestamps.sql');
    await uploadFile(conn, path.join(rootDir, 'database', 'migration_update_payment_methods_v2.sql'), '/tmp/migration_update_payment_methods_v2.sql');
    await uploadFile(conn, path.join(rootDir, 'database', 'migration_seed_vip_services_v2.sql'), '/tmp/migration_seed_vip_services_v2.sql');
    await uploadFile(conn, path.join(rootDir, 'database', 'migration_add_order_id_to_services.sql'), '/tmp/migration_add_order_id_to_services.sql');

    // 2. Repo path
    const repoPath = '~/Sniper-Car-Care---POS-System';
    const backendPath = `${repoPath}/backend`;

    // 3. Update code using Git
    console.log('🔄 Updating codebase from GitHub...');
    await executeCommand(conn, `cd ${repoPath} && git fetch --all && git reset --hard origin/ravix`);
    
    console.log('📦 Installing backend dependencies...');
    await executeCommand(conn, `cd ${backendPath} && npm install --production`);
    
    console.log('🗄️ Running DB Migrations...');
    await executeCommand(conn, `mysql -u root -p123456 < /tmp/migration_add_service_timestamps.sql`);
    await executeCommand(conn, `mysql -u root -p123456 < /tmp/migration_update_payment_methods_v2.sql`);
    await executeCommand(conn, `mysql -u root -p123456 < /tmp/migration_seed_vip_services_v2.sql`);
    await executeCommand(conn, `mysql -u root -p123456 < /tmp/migration_add_order_id_to_services.sql`);

    console.log('🌱 Seeding services into database...');
    await executeCommand(conn, `cd ${backendPath} && node scripts/seedNewServices.js`);

    console.log('🖼️  Copying default service images & updating database...');
    await executeCommand(conn, `cd ${backendPath} && node scripts/copyOriginalImages.js`);

    console.log('🔄 Restarting backend server...');
    await executeCommand(conn, `pm2 restart all || pm2 start server.js`);

    // 4. Extract frontends
    console.log('📦 Deploying Frontend (POS Dashboard)...');
    await executeCommand(conn, 'mkdir -p /var/www/pos-dashboard && rm -rf /var/www/pos-dashboard/*');
    await executeCommand(conn, 'tar -xzf /tmp/frontend.tar.gz -C /var/www/pos-dashboard/');

    console.log('📦 Deploying Frontend (Saloon Site)...');
    await executeCommand(conn, 'mkdir -p /var/www/customer-saloon && rm -rf /var/www/customer-saloon/*');
    await executeCommand(conn, 'tar -xzf /tmp/saloon.tar.gz -C /var/www/customer-saloon/');

    console.log('📦 Deploying Frontend (4x4 Site)...');
    await executeCommand(conn, 'mkdir -p /var/www/customer-4x4 && rm -rf /var/www/customer-4x4/*');
    await executeCommand(conn, 'tar -xzf /tmp/4x4.tar.gz -C /var/www/customer-4x4/');

    // 5. Run Nginx Patching
    console.log('🔧 Running Nginx patching script...');
    const { execSync } = require('child_process');
    try {
      execSync(`node "${path.join(__dirname, 'patch-nginx.js')}"`, { stdio: 'inherit' });
    } catch (patchErr) {
      console.error('⚠️ Nginx patching script failed, but continuing deployment cleanup:', patchErr.message);
    }

    // 6. Cleanup
    console.log('🧹 Cleaning up remote temporary files...');
    await executeCommand(conn, 'rm -f /tmp/frontend.tar.gz /tmp/saloon.tar.gz /tmp/4x4.tar.gz /tmp/migration_add_service_timestamps.sql /tmp/migration_update_payment_methods_v2.sql /tmp/migration_seed_vip_services_v2.sql /tmp/migration_add_order_id_to_services.sql');

    console.log('🚀 DEPLOYMENT COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  } finally {
    conn.end();
  }
}).connect(config);
