const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase
} = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(authorize('admin'), createPurchase);

router.route('/:id')
  .get(getPurchase)
  .put(authorize('admin'), updatePurchase)
  .delete(authorize('admin'), deletePurchase);

module.exports = router;
