const express = require('express');
const router = express.Router();
const publicProductController = require('../controllers/publicProductController');
const publicOrderController = require('../controllers/publicOrderController');
const publicCustomerController = require('../controllers/publicCustomerController');
const { getPlateCodesByEmirate } = require('../controllers/vehicleRegistrationController');

// Public product routes (no authentication required)
router.get('/products', publicProductController.getProducts);
router.get('/extra-services', publicProductController.getExtraServices);
router.get('/products/:id', publicProductController.getProduct);

// Public customer routes
router.get('/customer/by-plate', publicCustomerController.getCustomerByPlate);
router.get('/customer/by-id', publicCustomerController.getCustomerById);
router.get('/customer/orders', publicCustomerController.getCustomerOrders);
router.get('/customer/notifications', publicCustomerController.getCustomerNotifications);
router.post('/customer/notifications/mark-read', publicCustomerController.markNotificationsAsRead);
router.post('/customer/register', publicCustomerController.registerCustomer);

// Public order routes
router.post('/orders', publicOrderController.createOrder);
router.get('/order/:id', publicOrderController.getOrder);
router.get('/orders/:id', publicOrderController.getOrder);
router.post('/orders/confirm', publicOrderController.confirmOrder);
router.patch('/orders/:id/note', publicOrderController.updateOrderNote);
router.put('/orders/:id/note', publicOrderController.updateOrderNote);
router.post('/orders/:id/extra-services', publicOrderController.addExtraServices);
router.put('/orders/:id/extra-services', publicOrderController.addExtraServices);

// Public payment routes
router.post('/payments/create-intent', publicOrderController.createPaymentIntent);
router.post('/payments/confirm', publicOrderController.confirmPayment);

const { initiateTapPayment, handleTapCallback } = require('../controllers/tapPaymentController');
router.post('/payments/tap/create', initiateTapPayment);
router.get('/payments/tap-callback', handleTapCallback);

// Public plate codes lookup (used by customer registration)
router.get('/plate-codes/:emirate', getPlateCodesByEmirate);

module.exports = router;

