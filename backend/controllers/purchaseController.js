const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private (Admin & Staff)
const getPurchases = asyncHandler(async (req, res) => {
  const { supplier_id, category, start_date, end_date, search } = req.query;
  let query = `
    SELECT p.*, s.name as supplier_name 
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (supplier_id) {
    query += ' AND p.supplier_id = ?';
    params.push(supplier_id);
  }

  if (category) {
    query += ' AND p.category = ?';
    params.push(category);
  }

  if (start_date && end_date) {
    query += ' AND p.purchase_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ' AND p.purchase_date >= ?';
    params.push(start_date);
  } else if (end_date) {
    query += ' AND p.purchase_date <= ?';
    params.push(end_date);
  }

  if (search) {
    query += ' AND (p.item_name LIKE ? OR p.notes LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  query += ' ORDER BY p.purchase_date DESC, p.id DESC';

  const [purchases] = await pool.query(query, params);
  res.json({ success: true, count: purchases.length, purchases });
});

// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private (Admin & Staff)
const getPurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [purchases] = await pool.query(`
    SELECT p.*, s.name as supplier_name 
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ?
  `, [id]);

  if (purchases.length === 0) {
    return res.status(404).json({ success: false, message: 'Purchase record not found' });
  }

  res.json({ success: true, purchase: purchases[0] });
});

// @desc    Create purchase
// @route   POST /api/purchases
// @access  Private (Admin)
const createPurchase = asyncHandler(async (req, res) => {
  const { supplier_id, item_name, category, quantity, unit_price, purchase_date, payment_status, payment_method, notes } = req.body;

  if (!item_name || !category || !unit_price || !purchase_date) {
    return res.status(400).json({ success: false, message: 'Item name, category, unit price, and purchase date are required' });
  }

  const qty = parseInt(quantity) || 1;
  const price = parseFloat(unit_price);
  const total = qty * price;

  const [result] = await pool.query(
    'INSERT INTO purchases (supplier_id, item_name, category, quantity, unit_price, total_price, purchase_date, payment_status, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [supplier_id || null, item_name, category, qty, price, total, purchase_date, payment_status || 'paid', payment_method || 'cash', notes || null]
  );

  const [newPurchase] = await pool.query('SELECT * FROM purchases WHERE id = ?', [result.insertId]);
  res.status(201).json({ success: true, message: 'Purchase logged successfully', purchase: newPurchase[0] });
});

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Private (Admin)
const updatePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { supplier_id, item_name, category, quantity, unit_price, purchase_date, payment_status, payment_method, notes } = req.body;

  const [purchases] = await pool.query('SELECT * FROM purchases WHERE id = ?', [id]);
  if (purchases.length === 0) {
    return res.status(404).json({ success: false, message: 'Purchase record not found' });
  }

  const qty = parseInt(quantity) || 1;
  const price = parseFloat(unit_price);
  const total = qty * price;

  await pool.query(
    'UPDATE purchases SET supplier_id = ?, item_name = ?, category = ?, quantity = ?, unit_price = ?, total_price = ?, purchase_date = ?, payment_status = ?, payment_method = ?, notes = ? WHERE id = ?',
    [supplier_id || null, item_name, category, qty, price, total, purchase_date, payment_status || 'paid', payment_method || 'cash', notes || null, id]
  );

  const [updated] = await pool.query('SELECT * FROM purchases WHERE id = ?', [id]);
  res.json({ success: true, message: 'Purchase updated successfully', purchase: updated[0] });
});

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private (Admin)
const deletePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const [purchases] = await pool.query('SELECT id FROM purchases WHERE id = ?', [id]);
  if (purchases.length === 0) {
    return res.status(404).json({ success: false, message: 'Purchase record not found' });
  }

  await pool.query(
    'UPDATE purchases SET is_deleted = 1, delete_reason = ? WHERE id = ?',
    [reason || 'No reason specified', id]
  );
  res.json({ success: true, message: 'Purchase record deleted successfully' });
});

module.exports = {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase
};
