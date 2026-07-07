const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (Admin & Staff)
const getExpenses = asyncHandler(async (req, res) => {
  const { category, start_date, end_date, search } = req.query;
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (start_date && end_date) {
    query += ' AND expense_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ' AND expense_date >= ?';
    params.push(start_date);
  } else if (end_date) {
    query += ' AND expense_date <= ?';
    params.push(end_date);
  }

  if (search) {
    query += ' AND (title LIKE ? OR notes LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  query += ' ORDER BY expense_date DESC, id DESC';

  const [expenses] = await pool.query(query, params);
  res.json({ success: true, count: expenses.length, expenses });
});

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private (Admin & Staff)
const getExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [expenses] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);

  if (expenses.length === 0) {
    return res.status(404).json({ success: false, message: 'Expense record not found' });
  }

  res.json({ success: true, expense: expenses[0] });
});

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private (Admin)
const createExpense = asyncHandler(async (req, res) => {
  const { title, category, amount, expense_date, payment_method, notes } = req.body;

  if (!title || !category || !amount || !expense_date) {
    return res.status(400).json({ success: false, message: 'Title, category, amount, and expense date are required' });
  }

  const [result] = await pool.query(
    'INSERT INTO expenses (title, category, amount, expense_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [title, category, parseFloat(amount), expense_date, payment_method || 'cash', notes || null]
  );

  const [newExpense] = await pool.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
  res.status(201).json({ success: true, message: 'Expense logged successfully', expense: newExpense[0] });
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin)
const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, category, amount, expense_date, payment_method, notes } = req.body;

  const [expenses] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
  if (expenses.length === 0) {
    return res.status(404).json({ success: false, message: 'Expense record not found' });
  }

  await pool.query(
    'UPDATE expenses SET title = ?, category = ?, amount = ?, expense_date = ?, payment_method = ?, notes = ? WHERE id = ?',
    [title, category, parseFloat(amount), expense_date, payment_method || 'cash', notes || null, id]
  );

  const [updated] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
  res.json({ success: true, message: 'Expense updated successfully', expense: updated[0] });
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin)
const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [expenses] = await pool.query('SELECT id FROM expenses WHERE id = ?', [id]);
  if (expenses.length === 0) {
    return res.status(404).json({ success: false, message: 'Expense record not found' });
  }

  await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
  res.json({ success: true, message: 'Expense record deleted successfully' });
});

module.exports = {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense
};
