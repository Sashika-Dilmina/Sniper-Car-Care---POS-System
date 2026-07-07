const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getSalesReport,
  getDailyBusinessSummary,
  getMonthlySummary,
  getPaymentTypeReport,
  getCustomerWiseReport,
  getSupplierPaymentReport,
  getPurchasesReport,
  getProfitLossReport
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Dashboard is accessible to both admin and staff
router.get('/dashboard', getDashboardAnalytics);

// All reports routes are admin only
router.get('/reports/sales', authorize('admin'), getSalesReport);
router.get('/reports/daily-summary', authorize('admin'), getDailyBusinessSummary);
router.get('/reports/monthly-summary', authorize('admin'), getMonthlySummary);
router.get('/reports/payment-types', authorize('admin'), getPaymentTypeReport);
router.get('/reports/customer-wise', authorize('admin'), getCustomerWiseReport);
router.get('/reports/supplier-payments', authorize('admin'), getSupplierPaymentReport);
router.get('/reports/purchases', authorize('admin'), getPurchasesReport);
router.get('/reports/profit-loss', authorize('admin'), getProfitLossReport);

module.exports = router;

