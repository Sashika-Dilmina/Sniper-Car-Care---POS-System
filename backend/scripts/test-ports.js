const axios = require('axios');

const ports = [3000, 3001, 3002, 3003, 5000, 5173, 5174, 51779, 51780, 51781, 51782];

async function run() {
  for (const port of ports) {
    try {
      const res = await axios.get(`http://localhost:${port}`, { timeout: 1500 });
      let title = 'No title found';
      const match = res.data.match(/<title>([^<]+)<\/title>/i);
      if (match) title = match[1];
      console.log(`Port ${port}: SUCCESS - Title: "${title}"`);
    } catch (err) {
      // Ignored
    }
  }
}

run();
