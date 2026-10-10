const { Client } = require('ssh2');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.DEPLOY_HOST;
const username = process.env.DEPLOY_USER;
const password = process.env.DEPLOY_PASS;

if (!host || !username || !password) {
  console.error('❌ Credentials missing in backend/.env');
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

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`📤 Uploading: ${localPath} -> ${remotePath}...`);
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) return reject(err);
      console.log(`✅ Upload complete.`);
      resolve();
    });
  });
}

conn.on('ready', () => {
  console.log('⚡ Connected to VPS. Starting SFTP upload...');
  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }
    
    try {
      const rootDir = path.resolve(__dirname, '../..');
      
      const filesToUpload = [
        {
          local: path.join(rootDir, 'backend/services/anprWatcher.js'),
          remote: '/root/Sniper-Car-Care---POS-System/backend/services/anprWatcher.js'
        },
        {
          local: path.join(rootDir, 'backend/services/ocrService.js'),
          remote: '/root/Sniper-Car-Care---POS-System/backend/services/ocrService.js'
        },
        {
          local: path.join(rootDir, 'backend/controllers/anprController.js'),
          remote: '/root/Sniper-Car-Care---POS-System/backend/controllers/anprController.js'
        },
        {
          local: path.join(rootDir, 'backend/controllers/publicCustomerController.js'),
          remote: '/root/Sniper-Car-Care---POS-System/backend/controllers/publicCustomerController.js'
        }
      ];

      for (const file of filesToUpload) {
        await uploadFile(sftp, file.local, file.remote);
      }
      
      sftp.end();
      
      console.log('\n🔄 Restarting PM2 backend process on VPS...');
      conn.exec('pm2 restart all', (execErr, stream) => {
        if (execErr) {
          console.error('PM2 restart execution failed:', execErr);
          conn.end();
          return;
        }
        stream.on('close', () => {
          console.log('✅ PM2 backend restarted successfully.');
          conn.end();
        }).on('data', (d) => process.stdout.write(d.toString()))
          .stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
      
    } catch (uploadErr) {
      console.error('❌ Upload failed:', uploadErr.message);
      sftp.end();
      conn.end();
    }
  });
}).connect(config);
