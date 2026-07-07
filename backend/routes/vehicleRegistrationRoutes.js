const express = require('express');
const router = express.Router();
const { getPlateCodesByEmirate } = require('../controllers/vehicleRegistrationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/plate-codes/:emirate', getPlateCodesByEmirate);

module.exports = router;
