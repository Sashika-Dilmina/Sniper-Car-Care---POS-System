const { generateInvoicePDF } = require('../utils/pdfReportGenerator');
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function testPdfOnVps() {
  if (!process.env.DEPLOY_HOST || !process.env.DEPLOY_USER) {
    console.log('VPS credentials missing');
    return;
  }

  const config = {
    host: process.env.DEPLOY_HOST,
    port: parseInt(process.env.DEPLOY_PORT || '22'),
    username: process.env.DEPLOY_USER,
    password: process.env.DEPLOY_PASS,
    readyTimeout: 30000
  };

  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log('⚡ Connected to VPS. Testing Invoice PDF generation...');
      const cmd = `
        NODE_ENV=production node -e "
          const { generateInvoicePDF } = require('./utils/pdfReportGenerator');
          const fs = require('fs');
          const path = require('path');
          async function run() {
            const dummyOrder = {
              id: 675,
              customer_name: 'Test Customer',
              customer_phone: '+9715555555',
              vehicle_plate: 'Dubai A 12345',
              vehicle_type: 'Saloon',
              status: 'completed',
              payment_status: 'paid',
              method: 'Cash',
              items: [{ product_name: 'Body Wash', category: 'Services', quantity: 1, price: 50 }],
              total: 50
            };
            const invoicesDir = path.join(__dirname, 'uploads', 'invoices');
            if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
            const testFile = path.join(invoicesDir, 'test-invoice.pdf');
            await generateInvoicePDF(dummyOrder, testFile);
            console.log('✅ Invoice PDF generated successfully at:', testFile);
            process.exit(0);
          }
          run().catch(err => { console.error(err); process.exit(1); });
        "
      `;
      conn.exec(`cd /root/Sniper-Car-Care---POS-System/backend && ${cmd}`, (err, stream) => {
        if (err) {
          console.error('VPS Exec error:', err);
          conn.end();
          resolve();
          return;
        }
        stream.on('close', () => {
          conn.end();
          resolve();
        }).on('data', (d) => process.stdout.write(d.toString()))
          .stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    }).on('error', (err) => {
      console.error('VPS Connection error:', err.message);
      resolve();
    }).connect(config);
  });
}

testPdfOnVps();
