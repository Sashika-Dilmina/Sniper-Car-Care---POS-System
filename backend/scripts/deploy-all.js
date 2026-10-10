const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

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

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      files.push(name);
    }
  }
  return files;
}

function makeRemoteDir(sftp, remotePath) {
  return new Promise((resolve) => {
    sftp.mkdir(remotePath, () => resolve());
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) {
        console.error(`❌ Failed: ${path.basename(localPath)}:`, err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function uploadDistFolder(sftp, localDistDir, remoteTargetDir, folderName) {
  console.log(`\n📦 Uploading ${folderName} -> ${remoteTargetDir}...`);
  const localFiles = getFiles(localDistDir);
  console.log(`Found ${localFiles.length} files to upload for ${folderName}.`);

  const dirsToCreate = new Set();
  for (const file of localFiles) {
    const relativePath = path.relative(localDistDir, file);
    const relativeDir = path.dirname(relativePath);
    if (relativeDir !== '.') {
      const parts = relativeDir.split(path.sep);
      let currentDir = remoteTargetDir;
      for (const part of parts) {
        currentDir = `${currentDir}/${part}`;
        dirsToCreate.add(currentDir);
      }
    }
  }

  for (const dir of Array.from(dirsToCreate).sort()) {
    await makeRemoteDir(sftp, dir);
  }

  let count = 0;
  for (const file of localFiles) {
    const relativePath = path.relative(localDistDir, file);
    const remotePath = `${remoteTargetDir}/${relativePath.replace(/\\/g, '/')}`;
    await uploadFile(sftp, file, remotePath);
    count++;
    if (count % 10 === 0 || count === localFiles.length) {
      process.stdout.write(`Uploaded ${count}/${localFiles.length} files...\r`);
    }
  }
  console.log(`\n✅ ${folderName} deployment complete!`);
}

conn.on('ready', () => {
  console.log('⚡ Connected to Hostinger VPS via SSH. Starting deployment...');
  
  // 1. Run git pull on VPS & restart PM2
  conn.exec('cd /root/Sniper-Car-Care---POS-System && git pull origin ravix && cd backend && npm install && pm2 restart all', (err, stream) => {
    if (err) {
      console.error('Git pull / PM2 restart failed:', err);
    } else {
      stream.on('close', (code) => {
        console.log(`\n✅ Git pull & PM2 restart finished with code ${code}`);

        // 2. Open SFTP for static builds
        conn.sftp(async (sftpErr, sftp) => {
          if (sftpErr) {
            console.error('SFTP error:', sftpErr);
            conn.end();
            return;
          }

          try {
            const rootDir = path.resolve(__dirname, '../..');
            
            // POS Dashboard
            await uploadDistFolder(
              sftp,
              path.join(rootDir, 'frontend/dist'),
              '/var/www/pos-dashboard',
              'POS Dashboard'
            );

            // Saloon Customer Website
            await uploadDistFolder(
              sftp,
              path.join(rootDir, 'customer-website-saloon/dist'),
              '/var/www/customer-saloon',
              'Saloon Customer Site'
            );

            // 4x4 Customer Website
            await uploadDistFolder(
              sftp,
              path.join(rootDir, 'customer-website-4x4/dist'),
              '/var/www/customer-4x4',
              '4x4 Customer Site'
            );

            sftp.end();
            console.log('\n=============================================');
            console.log('🚀 ALL DEPLOYMENTS COMPLETED SUCCESSFULLY!');
            console.log('=============================================');
            conn.end();
          } catch (e) {
            console.error('SFTP Deployment error:', e.message);
            sftp.end();
            conn.end();
          }
        });
      }).on('data', (d) => process.stdout.write(d.toString()))
        .stderr.on('data', (d) => process.stderr.write(d.toString()));
    }
  });
}).connect(config);
