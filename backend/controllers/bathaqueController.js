const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { getBathaqueLoyalty, ensureBathaqueLoyalty, incrementBathaqueStamp, redeemBathaqueFreeWash } = require('../utils/bathaqueLoyalty');

// In-memory queue for live scans pushed to POS Cashier (cleaned up automatically every 15 minutes)
let scanQueue = [];

const cleanExpiredQueue = () => {
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  scanQueue = scanQueue.filter(item => item.timestamp > fifteenMinutesAgo);
};

// @desc    Check Bathaque ID / Scanned QR
// @route   GET /api/bathaque/check/:bathaque_id
// @access  Private
const checkBathaque = asyncHandler(async (req, res) => {
  let { bathaque_id } = req.params;
  if (!bathaque_id) {
    return res.status(400).json({ message: 'Bathaque ID is required' });
  }

  // Support scanned raw data or prefixed data like BATHAQUE:BQ12345
  bathaque_id = bathaque_id.replace(/^BATHAQUE:/i, '').trim();

  // Find all customers / vehicles linked to this Bathaque ID
  const [customers] = await pool.query(
    `SELECT id, name, phone, vehicle_plate, vehicle_type, province, created_at 
     FROM customers 
     WHERE bathaque_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
     ORDER BY id ASC`,
    [bathaque_id]
  );

  // Ensure loyalty row exists
  const loyalty = await getBathaqueLoyalty(pool, bathaque_id);

  res.json({
    success: true,
    bathaque_id,
    wash_stamps: loyalty.wash_stamps,
    total_washes: loyalty.total_washes,
    free_washes_earned: loyalty.free_washes_earned,
    free_washes_redeemed: loyalty.free_washes_redeemed,
    is_free_eligible: loyalty.is_free_eligible,
    stamps_needed: loyalty.stamps_needed,
    customers_count: customers.length,
    customers
  });
});

// @desc    Search / autocomplete Bathaque IDs
// @route   GET /api/bathaque/search
// @access  Private
const searchBathaque = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim() === '') {
    return res.json({ results: [] });
  }

  const cleanQuery = query.trim();

  const [results] = await pool.query(
    `SELECT DISTINCT c.bathaque_id, 
            COALESCE(bl.wash_stamps, 0) as wash_stamps,
            COUNT(c.id) as vehicle_count,
            GROUP_CONCAT(c.vehicle_plate SEPARATOR ', ') as vehicles
     FROM customers c
     LEFT JOIN bathaque_loyalty bl ON c.bathaque_id = bl.bathaque_id
     WHERE c.bathaque_id LIKE ? AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
     GROUP BY c.bathaque_id
     LIMIT 10`,
    [`%${cleanQuery}%`]
  );

  res.json({ results });
});

// @desc    Award +1 wash stamp to a Bathaque ID
// @route   POST /api/bathaque/award-stamp
// @access  Private
const awardStamp = asyncHandler(async (req, res) => {
  let { bathaque_id } = req.body;
  if (!bathaque_id) {
    return res.status(400).json({ message: 'Bathaque ID is required' });
  }

  bathaque_id = bathaque_id.replace(/^BATHAQUE:/i, '').trim();

  const loyalty = await incrementBathaqueStamp(pool, bathaque_id);
  if (!loyalty) {
    return res.status(404).json({ message: 'Failed to find or award stamp to Bathaque ID' });
  }

  res.json({
    success: true,
    message: loyalty.free_wash_earned_now 
      ? '🎉 5th stamp added! Next (6th) wash is 100% FREE!' 
      : `✓ Stamp added successfully! (${loyalty.wash_stamps}/5 stamps)`,
    loyalty
  });
});

// @desc    Push scanned customer to POS Cashier queue
// @route   POST /api/bathaque/queue
// @access  Private
const pushToScanQueue = asyncHandler(async (req, res) => {
  const { bathaque_id, customer_id } = req.body;
  if (!bathaque_id && !customer_id) {
    return res.status(400).json({ message: 'Bathaque ID or Customer ID is required' });
  }

  cleanExpiredQueue();

  let targetBathaqueId = bathaque_id ? bathaque_id.replace(/^BATHAQUE:/i, '').trim() : null;
  let targetCustomer = null;

  if (customer_id) {
    const [custRows] = await pool.query(
      'SELECT id, name, phone, vehicle_plate, vehicle_type, province, bathaque_id FROM customers WHERE id = ?',
      [customer_id]
    );
    if (custRows.length > 0) {
      targetCustomer = custRows[0];
      if (!targetBathaqueId) targetBathaqueId = targetCustomer.bathaque_id;
    }
  }

  if (!targetCustomer && targetBathaqueId) {
    const [custRows] = await pool.query(
      'SELECT id, name, phone, vehicle_plate, vehicle_type, province, bathaque_id FROM customers WHERE bathaque_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) LIMIT 1',
      [targetBathaqueId]
    );
    if (custRows.length > 0) {
      targetCustomer = custRows[0];
    }
  }

  const loyalty = targetBathaqueId ? await getBathaqueLoyalty(pool, targetBathaqueId) : null;

  const queueItem = {
    id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    bathaque_id: targetBathaqueId,
    customer: targetCustomer,
    loyalty: loyalty,
    scanned_by: req.user?.name || 'Staff Scanner',
    timestamp: Date.now()
  };

  // Remove any existing pending scan for this same customer or Bathaque ID
  scanQueue = scanQueue.filter(item => 
    (!targetBathaqueId || item.bathaque_id !== targetBathaqueId) &&
    (!targetCustomer || item.customer?.id !== targetCustomer.id)
  );

  scanQueue.unshift(queueItem);

  res.json({
    success: true,
    message: 'Customer sent to Cashier POS queue successfully!',
    item: queueItem
  });
});

// @desc    Get active scans for Cashier POS
// @route   GET /api/bathaque/queue
// @access  Private
const getScanQueue = asyncHandler(async (req, res) => {
  cleanExpiredQueue();
  res.json({
    success: true,
    queue: scanQueue
  });
});

// @desc    Dismiss scan from queue
// @route   DELETE /api/bathaque/queue/:id
// @access  Private
const dismissScanQueueItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  scanQueue = scanQueue.filter(item => item.id !== id);
  res.json({ success: true, message: 'Queue item dismissed' });
});

module.exports = {
  checkBathaque,
  searchBathaque,
  awardStamp,
  pushToScanQueue,
  getScanQueue,
  dismissScanQueueItem
};
