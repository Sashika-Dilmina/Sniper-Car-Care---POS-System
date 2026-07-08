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

// Create the temporary test script that will run on the VPS
const vpsScriptContent = `
const pool = require('./config/database');
const controllers = require('./controllers/analyticsController');

// Mock response object
const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('SUCCESS JSON:', JSON.stringify(data, null, 2));
  },
  send: function(data) {
    console.log('SUCCESS SEND (length):', data ? data.length : 0);
  },
  setHeader: function(name, val) {
    // Noop
  }
};

async function run() {
  const reqDaily = { query: { date: '2026-06-26' } };
  const reqDateRange = { query: { start_date: '2026-05-01', end_date: '2026-06-30' } };

  console.log('--- Testing getDailyBusinessSummary ---');
  try {
    await controllers.getDailyBusinessSummary(reqDaily, mockRes, (err) => console.error('Next err:', err));
  } catch (e) {
    console.error('ERROR in getDailyBusinessSummary:', e);
  }

  console.log('--- Testing getPaymentTypeReport ---');
  try {
    await controllers.getPaymentTypeReport(reqDateRange, mockRes, (err) => console.error('Next err:', err));
  } catch (e) {
    console.error('ERROR in getPaymentTypeReport:', e);
  }

  console.log('--- Testing getCustomerWiseReport ---');
  try {
    await controllers.getCustomerWiseReport(reqDateRange, mockRes, (err) => console.error('Next err:', err));
  } catch (e) {
    console.error('ERROR in getCustomerWiseReport:', e);
  }

  console.log('--- Testing getSupplierPaymentReport ---');
  try {
    await controllers.getSupplierPaymentReport(reqDateRange, mockRes, (err) => console.error('Next err:', err));
  } catch (e) {
    console.error('ERROR in getSupplierPaymentReport:', e);
  }

  console.log('--- Testing getPurchasesReport ---');
  try {
    await controllers.getPurchasesReport(reqDateRange, mockRes, (err) => console.error('Next err:', err));
  } catch (e) {
    console.error('ERROR in getPurchasesReport:', e);
  }

  console.log('--- Testing getProfitLossReport ---');
  try {
    await controllers.getProfitLossReport(reqDateRange, mockRes, (err) => console.error('Next err:', err));
  } catch (e) {
    console.error('ERROR in getProfitLossReport:', e);
  }

  process.exit(0);
}

run();
`;

const conn = new Client();

function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
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

conn.on('ready', () => {
  console.log('⚡ Connected to VPS via SSH');
  
  // Create file directly on VPS using cat
  const setupCmd = `cat << 'EOF' > /tmp/test_report_handlers.js
${vpsScriptContent}
EOF
`;
  
  conn.exec(setupCmd, async (err, stream) => {
    if (err) {
      console.error('Error writing file:', err);
      conn.end();
      return;
    }
    
    stream.on('close', async () => {
      console.log('⚡ Temporary test script written on VPS. Running now...');
      try {
        await executeCommand(conn, 'cd ~/Sniper-Car-Care---POS-System/backend && node /tmp/test_report_handlers.js');
      } catch (runErr) {
        console.error('Error running test script:', runErr);
      } finally {
        await executeCommand(conn, 'rm -f /tmp/test_report_handlers.js');
        conn.end();
      }
    });
  });
}).connect(config);
