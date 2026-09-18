const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { getBathaqueLoyalty, ensureBathaqueLoyalty } = require('../utils/bathaqueLoyalty');

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

module.exports = {
  checkBathaque,
  searchBathaque
};
