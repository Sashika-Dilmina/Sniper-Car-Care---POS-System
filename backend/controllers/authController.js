const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (Admin only in production)
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  // Check if user exists
  const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUsers.length > 0) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const finalRole = role === 'admin' ? 'admin' : 'staff';

  // Create user
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, finalRole]
  );

  const [newUser] = await pool.query(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json({
    message: 'User registered successfully',
    user: newUser[0],
    token: generateToken(newUser[0].id)
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  // Check for user
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  
  if (users.length === 0 || users[0].is_deleted === 1) {
    return res.status(401).json({ message: 'Invalid credentials or account is deactivated' });
  }

  const user = users[0];

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token: generateToken(user.id)
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const [users] = await pool.query(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [req.user.id]
  );

  res.json({ user: users[0] });
});

module.exports = {
  register,
  login,
  getMe
};

