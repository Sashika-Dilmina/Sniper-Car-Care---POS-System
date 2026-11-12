const express = require('express');
const router = express.Router();
const {
  getCustomerCredits,
  getCreditRecoveries,
  createCustomerCredit,
  recoverCreditPayment,
  getCreditHistory
} = require('../controllers/creditController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getCustomerCredits)
  .post(createCustomerCredit);

router.route('/recoveries')
  .get(getCreditRecoveries);

router.route('/:id/recover')
  .post(recoverCreditPayment);

router.route('/:id/history')
  .get(getCreditHistory);

module.exports = router;
