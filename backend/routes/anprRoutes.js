const express = require('express');
const router = express.Router();
const {
  detectPlate,
  getLatestDetections,
  registerFromANPR,
  sendWelcomeFromDashboard,
} = require('../controllers/anprController');
const { protect } = require('../middleware/auth');

// Public route for Camera/Simulation (no token required)
router.post('/detect', detectPlate);

// Protected routes (dashboard usage)
router.use(protect);
router.get('/latest', getLatestDetections);
router.post('/register', registerFromANPR);
router.post('/send-welcome', sendWelcomeFromDashboard);

module.exports = router;

