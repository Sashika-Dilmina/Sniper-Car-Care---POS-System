const pool = require('../config/database');
const { processManualPayment } = require('../controllers/paymentController');

async function runTest() {
  try {
    // Get the last order ID from the database
    const [orders] = await pool.query('SELECT id, total FROM orders ORDER BY id DESC LIMIT 1');
    if (orders.length === 0) {
      console.log('No orders exist in the database to run the test.');
      return;
    }
    const lastOrder = orders[0];
    console.log(`Testing with real order ID: ${lastOrder.id}, total: ${lastOrder.total}`);

    const req = {
      body: {
        order_id: lastOrder.id,
        amount: parseFloat(lastOrder.total),
        method: 'cash',
        status: 'pending'
      }
    };

    const res = {
      statusCode: 200,
      json: function(data) {
        console.log('Response Status:', this.statusCode);
        console.log('Response JSON Data:', data);
      },
      status: function(code) {
        this.statusCode = code;
        return this;
      }
    };

    const next = function(err) {
      console.error('Next called with error:', err);
    };

    processManualPayment(req, res, next);
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (err) {
    console.error('Test crashed:', err);
  } finally {
    await pool.end();
  }
}

runTest();
