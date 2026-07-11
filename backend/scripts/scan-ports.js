const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function run() {
  console.log('Scanning ports from 3000 to 5200...');
  for (let port = 3000; port <= 5200; port++) {
    // Only print certain ranges to avoid cluttering, or check all
    const open = await checkPort(port);
    if (open) {
      console.log(`Port ${port} is OPEN`);
    }
  }
}

run();
