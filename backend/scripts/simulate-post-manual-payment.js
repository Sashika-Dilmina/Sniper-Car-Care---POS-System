const pool = require('../config/database');
const { processManualPayment } = require('../controllers/paymentController');

// Mock request and response
async function runTest() {
  const req = {
    body: {
      order_id: 30, 
      amount: 100.00,
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

  try {
    console.log('Executing processManualPayment...');
    processManualPayment(req, res, next);
    // Wait for the async command to execute fully
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (err) {
    console.error('Controller execution crashed:', err);
  } finally {
    await pool.end();
  }
}

runTest();
