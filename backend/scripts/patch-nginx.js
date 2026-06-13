const { Client } = require('ssh2');

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

conn.on('ready', async () => {
  console.log('⚡ Connected to VPS via SSH for Nginx Patching');
  try {
    const configPath = '/etc/nginx/sites-available/sniper-car-care';
    
    // 1. Read the current configuration
    console.log(`Reading remote config from ${configPath}...`);
    const catResult = await new Promise((resolve, reject) => {
      conn.exec(`cat ${configPath}`, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        stream.on('close', () => resolve(stdout))
              .on('data', (data) => { stdout += data.toString(); });
      });
    });

    if (!catResult) {
      throw new Error(`Failed to read config from ${configPath} or file is empty.`);
    }

    // 2. Check if already fully patched
    if (catResult.includes('location ^~ /uploads/')) {
      console.log('✨ Nginx config is already fully patched with ^~ /uploads/ location block.');
    } else if (catResult.includes('location /uploads/')) {
      console.log('🔧 Upgrading Nginx config to use prefix override (^~) for /uploads/...');
      const patchedConfig = catResult.split('location /uploads/').join('location ^~ /uploads/');
      
      // Write back config
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          const writeStream = sftp.createWriteStream(configPath);
          writeStream.on('close', resolve);
          writeStream.on('error', reject);
          writeStream.write(patchedConfig);
          writeStream.end();
        });
      });
      console.log('✨ Config upgraded successfully.');
    } else {
      console.log('🔧 Patching Nginx config...');
      
      const targetStr = `    # Backend API (Node.js on port 5000)
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }`;

      const replacementStr = `    client_max_body_size 50M;

    # Backend API (Node.js on port 5000)
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy uploads from the backend
    location ^~ /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }`;

      // We do a global replacement to patch all active server blocks
      const patchedConfig = catResult.split(targetStr).join(replacementStr);
      
      // Write back using SFTP write
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          const writeStream = sftp.createWriteStream(configPath);
          writeStream.on('close', resolve);
          writeStream.on('error', reject);
          writeStream.write(patchedConfig);
          writeStream.end();
        });
      });
      console.log('✨ Config written successfully.');
    }

    // 3. Verify configuration
    console.log('🔍 Testing Nginx configuration...');
    const testRes = await executeCommand(conn, 'nginx -t');
    if (testRes.code !== 0) {
      throw new Error(`Nginx configuration test failed: ${testRes.stderr}`);
    }

    // 4. Reload Nginx
    console.log('🔄 Reloading Nginx server...');
    const reloadRes = await executeCommand(conn, 'nginx -s reload');
    if (reloadRes.code !== 0) {
      throw new Error(`Nginx reload failed: ${reloadRes.stderr}`);
    }

    console.log('🚀 NGINX PATCHED AND RELOADED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Nginx patching failed:', err);
  } finally {
    conn.end();
  }
}).connect(config);
