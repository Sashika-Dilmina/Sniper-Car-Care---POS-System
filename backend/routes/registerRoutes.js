const express = require('express');
const router = express.Router();
const {
  getActiveRegister,
  openRegister,
  getRegisterReport,
  closeRegister,
  getRegistersList
} = require('../controllers/registerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/active', getActiveRegister);
router.post('/open', openRegister);
router.get('/report', getRegisterReport);
router.post('/close', closeRegister);
router.get('/list', getRegistersList);

module.exports = router;
