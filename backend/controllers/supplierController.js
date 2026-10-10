const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private (Admin & Staff)
const getSuppliers = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM suppliers WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR business_name LIKE ? OR phone LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY name ASC';

  const [suppliers] = await pool.query(query, params);
  res.json({ success: true, count: suppliers.length, suppliers });
});

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private (Admin & Staff)
const getSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [suppliers] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);

  if (suppliers.length === 0) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  res.json({ success: true, supplier: suppliers[0] });
});

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private (Admin)
const createSupplier = asyncHandler(async (req, res) => {
  const { name, business_name, phone, category, email, address } = req.body;

  if (!name || !phone || !category) {
    return res.status(400).json({ success: false, message: 'Name, phone, and category are required' });
  }

  const [result] = await pool.query(
    'INSERT INTO suppliers (name, business_name, phone, category, email, address) VALUES (?, ?, ?, ?, ?, ?)',
    [name, business_name || null, phone, category, email || null, address || null]
  );

  const [newSupplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
  res.status(201).json({ success: true, message: 'Supplier created successfully', supplier: newSupplier[0] });
});

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin)
const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, business_name, phone, category, email, address, status } = req.body;

  const [suppliers] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
  if (suppliers.length === 0) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  await pool.query(
    'UPDATE suppliers SET name = ?, business_name = ?, phone = ?, category = ?, email = ?, address = ?, status = ? WHERE id = ?',
    [name, business_name || null, phone, category, email || null, address || null, status || 'active', id]
  );

  const [updatedSupplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
  res.json({ success: true, message: 'Supplier updated successfully', supplier: updatedSupplier[0] });
});

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin)
const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const [suppliers] = await pool.query('SELECT id FROM suppliers WHERE id = ?', [id]);
  if (suppliers.length === 0) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  await pool.query(
    'UPDATE suppliers SET is_deleted = 1, delete_reason = ? WHERE id = ?',
    [reason || 'No reason specified', id]
  );
  res.json({ success: true, message: 'Supplier deleted successfully' });
});

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
