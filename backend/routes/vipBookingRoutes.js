const express = require('express');
const router = express.Router();
const {
  getVIPBookings,
  getVIPBookingById,
  createVIPBooking,
  updateVIPBooking,
  getVIPBookingsByDateRange,
  getAvailableSlots,
  deleteVIPBooking,
  getVIPServices,
  getVIPCustomers,
  getVIPCustomerById,
  getTodayVIPAppointments
} = require('../controllers/vipBookingController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/services', getVIPServices);
router.post('/bookings', createVIPBooking);
router.get('/bookings/available-slots/:date', getAvailableSlots);

// Protected routes (Admin/Staff)
router.use(protect);
router.get('/bookings', getVIPBookings);
router.get('/bookings/today', getTodayVIPAppointments);
router.get('/bookings/schedule', getVIPBookingsByDateRange);
router.get('/bookings/:id', getVIPBookingById);
router.patch('/bookings/:id', updateVIPBooking);
router.delete('/bookings/:id', deleteVIPBooking);

// Customer management (Admin & Staff)
router.get('/customers', getVIPCustomers);
router.get('/customers/:id', getVIPCustomerById);

module.exports = router;
