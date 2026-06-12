const { Client } = require('ssh2');

const config = {
  host: '72.62.254.128',
  port: 22,
  username: 'root',
  password: 'GrTKf/W@3U6Ur.KT',
  readyTimeout: 60000
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la ~/Sniper-Car-Care---POS-System/backend/uploads', (err, stream) => {
    if (err) throw err;
    let stdout = '';
    let stderr = '';
    stream.on('close', (code) => {
      console.log('Exit Code:', code);
      console.log('STDOUT:\n', stdout);
      console.log('STDERR:\n', stderr);
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    }).stderr.on('data', (data) => {
      stderr += data.toString();
    });
  });
}).connect(config);
