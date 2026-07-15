const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  getOrderPayments,
  processManualPayment
} = require('../controllers/paymentController');
const { initiateTapPayment } = require('../controllers/tapPaymentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.post('/manual', processManualPayment);
router.post('/tap/create', initiateTapPayment);
router.get('/order/:order_id', getOrderPayments);


module.exports = router;

