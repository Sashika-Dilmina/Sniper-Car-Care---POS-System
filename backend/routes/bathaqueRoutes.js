const express = require('express');
const router = express.Router();
const { 
  checkBathaque, 
  searchBathaque,
  awardStamp,
  pushToScanQueue,
  getScanQueue,
  dismissScanQueueItem
} = require('../controllers/bathaqueController');
const { protect } = require('../middleware/auth');

router.get('/check/:bathaque_id', protect, checkBathaque);
router.get('/search', protect, searchBathaque);
router.post('/award-stamp', protect, awardStamp);
router.post('/queue', protect, pushToScanQueue);
router.get('/queue', protect, getScanQueue);
router.delete('/queue/:id', protect, dismissScanQueueItem);

module.exports = router;
