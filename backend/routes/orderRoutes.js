const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderInvoicePDF,
  sendTapPaymentLink
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
router.post('/:id/send-tap-link', sendTapPaymentLink);

router.put('/:id/status', updateOrderStatus);

module.exports = router;

