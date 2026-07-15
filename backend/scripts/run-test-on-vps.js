const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

// Load environment variables from backend/.env
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

function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${cmd}`);
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
  console.log('⚡ Connected to VPS via SSH');
  try {
    const localScript = path.resolve(__dirname, '../../C/Users/ravin/.gemini/antigravity-ide/brain/8ea39b19-b069-42bf-9f5c-b15b8148c3b4/scratch/test_query.js');
    // Write test script on remote
    const remoteScript = '/tmp/test_query.js';
    
    await uploadFile(conn, 'C:/Users/ravin/.gemini/antigravity-ide/brain/8ea39b19-b069-42bf-9f5c-b15b8148c3b4/scratch/test_query.js', remoteScript);
    
    // Modify path inside script for remote environment
    await executeCommand(conn, `sed -i "s|C:/Projects/Sniper-Car-Care---POS-System/backend|/root/Sniper-Car-Care---POS-System/backend|g" ${remoteScript}`);
    
    // Run the script
    console.log('\n--- Running database test on remote VPS ---');
    await executeCommand(conn, `node ${remoteScript}`);
    console.log('-------------------------------------------\n');
    
    // Clean up
    await executeCommand(conn, `rm -f ${remoteScript}`);
  } catch (err) {
    console.error('❌ Run test failed:', err);
  } finally {
    conn.end();
  }
}).connect(config);
