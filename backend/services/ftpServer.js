const FtpSrv = require('ftp-srv');
const path = require('path');
require('dotenv').config();

const port = process.env.FTP_PORT || 2121;
const user = process.env.FTP_USER || 'anpr_camera';
const pass = process.env.FTP_PASS || 'sniper123';
const root = path.resolve(process.cwd(), process.env.FTP_ROOT || './uploads');

const ftpServer = new FtpSrv({
  url: `ftp://0.0.0.0:${port}`,
  anonymous: false,
  greeting: 'Sniper Car Care ANPR FTP Server'
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
  if (username === user && password === pass) {
    console.log(`[FTP] User ${username} logged in successfully`);
    return resolve({ root });
  }
  console.warn(`[FTP] Failed login attempt with username: ${username}`);
  return reject(new Error('Invalid username or password'));
});

ftpServer.on('client-error', ({connection, context, error}) => {
  console.error(`[FTP] Client error: ${error.message}`);
});

function startFtpServer() {
  ftpServer.listen().then(() => {
    console.log(`🚀 FTP Server running on port ${port}`);
    console.log(`📂 FTP Root: ${root}`);
  }).catch(err => {
    console.error('❌ Failed to start FTP Server:', err);
  });
}

module.exports = { startFtpServer };
