const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

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

const localDistDir = path.resolve(__dirname, '../../frontend/dist');
const remoteDir = '/var/www/pos-dashboard';

// Helper to recursively get files
function getFiles(dir, files = []) {
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
  return new Promise((resolve, reject) => {
    sftp.mkdir(remotePath, (err) => {
      // Ignore if dir already exists
      resolve();
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) {
        console.error(`❌ Failed to upload ${path.basename(localPath)}:`, err);
        reject(err);
      } else {
        console.log(`✅ Uploaded: ${path.relative(localDistDir, localPath)}`);
        resolve();
      }
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
      if (!fs.existsSync(localDistDir)) {
        console.error(`❌ Local dist folder not found at ${localDistDir}. Please run 'npm run build' in the frontend folder first!`);
        conn.end();
        return;
      }
      
      const localFiles = getFiles(localDistDir);
      console.log(`Found ${localFiles.length} files to upload.`);

      // Ensure all remote subdirectories exist
      const dirsToCreate = new Set();
      for (const file of localFiles) {
        const relativePath = path.relative(localDistDir, file);
        const relativeDir = path.dirname(relativePath);
        if (relativeDir !== '.') {
          const parts = relativeDir.split(path.sep);
          let currentDir = remoteDir;
          for (const part of parts) {
            currentDir = `${currentDir}/${part}`;
            dirsToCreate.add(currentDir);
          }
        }
      }

      // Create directories sequentially
      for (const dir of Array.from(dirsToCreate).sort()) {
        await makeRemoteDir(sftp, dir);
      }
      
      // Upload files
      for (const file of localFiles) {
        const relativePath = path.relative(localDistDir, file);
        const remotePath = `${remoteDir}/${relativePath.replace(/\\/g, '/')}`;
        await uploadFile(sftp, file, remotePath);
      }
      
      sftp.end();
      console.log('\n✨ Frontend deployment successful!');
      conn.end();
    } catch (e) {
      console.error('Deployment error:', e);
      sftp.end();
      conn.end();
    }
  });
}).connect(config);
