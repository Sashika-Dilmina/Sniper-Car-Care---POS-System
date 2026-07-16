const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderInvoicePDF
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrder)
  .delete(authorize('admin'), deleteOrder);

router.get('/:id/pdf', getOrderInvoicePDF);

router.put('/:id/status', updateOrderStatus);

module.exports = router;

