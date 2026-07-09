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
    console.log(`\n🤖 Executing: ${cmd}`);
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
    const repoPath = '/root/Sniper-Car-Care---POS-System';
    
    // 1. Pull changes
    console.log('📦 Pulling changes from GitHub...');
    const pullRes = await executeCommand(conn, `cd ${repoPath} && git pull origin ravix`);
    if (pullRes.code !== 0) throw new Error('Git pull failed');

    // 2. Install backend dependencies & Restart backend
    console.log('⚙️ Installing backend dependencies & restarting...');
    const backendRes = await executeCommand(conn, `cd ${repoPath}/backend && npm install && pm2 restart all`);
    if (backendRes.code !== 0) throw new Error('Backend update failed');

    // 3. Build & Deploy POS Dashboard
    console.log('🖥️ Building POS Dashboard...');
    const posRes = await executeCommand(conn, `cd ${repoPath}/frontend && npm install && npm run build && cp -rf dist/* /var/www/pos-dashboard/`);
    if (posRes.code !== 0) throw new Error('POS build failed');

    // 4. Build & Deploy Saloon customer website
    console.log('💇 Building Saloon Website...');
    const saloonRes = await executeCommand(conn, `cd ${repoPath}/customer-website-saloon && npm install && npm run build && cp -rf dist/* /var/www/customer-saloon/`);
    if (saloonRes.code !== 0) throw new Error('Saloon website build failed');

    // 5. Build & Deploy 4x4 customer website
    console.log('🚗 Building 4x4 Website...');
    const website4x4Res = await executeCommand(conn, `cd ${repoPath}/customer-website-4x4 && npm install && npm run build && cp -rf dist/* /var/www/customer-4x4/`);
    if (website4x4Res.code !== 0) throw new Error('4x4 website build failed');

    console.log('\n🎉 ================================================');
    console.log('🎉 VPS DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log('🎉 ================================================');

  } catch (err) {
    console.error('\n❌ Deployment failed:', err.message);
  } finally {
    conn.end();
  }
}).connect(config);
