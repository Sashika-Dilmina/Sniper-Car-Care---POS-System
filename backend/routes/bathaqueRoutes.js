const express = require('express');
const router = express.Router();
const { checkBathaque, searchBathaque } = require('../controllers/bathaqueController');
const { protect } = require('../middleware/auth');

router.get('/check/:bathaque_id', protect, checkBathaque);
router.get('/search', protect, searchBathaque);

module.exports = router;
