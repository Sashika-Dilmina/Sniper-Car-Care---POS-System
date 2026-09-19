const express = require('express');
const router = express.Router();
const {
  getFeedback,
  getFeedbackById,
  createFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  getPublicLatestFeedback
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

// Public routes for submitting and fetching top feedback
router.post('/', createFeedback);
router.get('/public/latest', getPublicLatestFeedback);

// Admin-only routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getFeedback);

router.route('/:id')
  .get(getFeedbackById)
  .delete(deleteFeedback);

router.route('/:id/status')
  .put(updateFeedbackStatus);

module.exports = router;





