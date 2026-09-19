const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const localDir = path.join(__dirname, '../uploads');
const remoteDir = '/root/Sniper-Car-Care---POS-System/backend/uploads';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready, opening SFTP...');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    const files = fs.readdirSync(localDir);
    console.log(`Found ${files.length} local upload files. Checking and uploading...`);

    let completed = 0;
    const uploadNext = (index) => {
      if (index >= files.length) {
        console.log('All upload files synced successfully!');
        conn.end();
        return;
      }

      const file = files[index];
      const localFilePath = path.join(localDir, file);
      const remoteFilePath = `${remoteDir}/${file}`;

      sftp.stat(remoteFilePath, (statErr) => {
        if (!statErr) {
          // File already exists on VPS
          uploadNext(index + 1);
        } else {
          console.log(`Uploading missing file: ${file}...`);
          sftp.fastPut(localFilePath, remoteFilePath, (putErr) => {
            if (putErr) {
              console.error(`Error uploading ${file}:`, putErr.message);
            } else {
              console.log(`Uploaded ${file}`);
            }
            uploadNext(index + 1);
          });
        }
      });
    };

    uploadNext(0);
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASS
});
