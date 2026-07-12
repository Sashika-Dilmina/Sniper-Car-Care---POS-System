const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');

// @desc    Get all employees (admin and staff only)
// @route   GET /api/employees
// @access  Private (Admin only)
const getEmployees = asyncHandler(async (req, res) => {
  const [employees] = await pool.query(`
    SELECT id, name, email, role, created_at, updated_at
    FROM users
    WHERE role IN ('admin', 'staff')
    ORDER BY created_at DESC
  `);

  res.json({ employees });
});

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private (Admin only)
const getEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [employees] = await pool.query(
    'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ? AND role IN ("admin", "staff")',
    [id]
  );

  if (employees.length === 0) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  res.json({ employee: employees[0] });
});

// @desc    Create employee
// @route   POST /api/employees
// @access  Private (Admin only)
const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const role = req.body.role === 'admin' ? 'admin' : 'staff';

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  // Check if email already exists
  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existing.length > 0) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, role]
  );

  const [newEmployee] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json({ 
    message: 'Employee created successfully', 
    employee: newEmployee[0] 
  });
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (Admin only)
const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const role = req.body.role === 'admin' ? 'admin' : 'staff';

  const [employees] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (employees.length === 0) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  // Check if email is taken by another user
  const [emailCheck] = await pool.query(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [email, id]
  );

  if (emailCheck.length > 0) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  // Build update query
  let updateQuery = 'UPDATE users SET name = ?, email = ?, role = ?';
  const params = [name, email, role];

  // Only update password if provided
  if (password && password.length > 0) {
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    updateQuery += ', password = ?';
    params.push(hashedPassword);
  }

  updateQuery += ' WHERE id = ?';
  params.push(id);

  await pool.query(updateQuery, params);

  const [updated] = await pool.query(
    'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );

  res.json({ message: 'Employee updated successfully', employee: updated[0] });
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin only)
const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [employees] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (employees.length === 0) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  await pool.query('DELETE FROM users WHERE id = ?', [id]);

  res.json({ message: 'Employee deleted successfully' });
});

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
};

