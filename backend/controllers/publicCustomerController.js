const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { getWashStamps } = require('../utils/loyaltyStamps');

// @desc    Get customer by vehicle plate (public)
// @route   GET /api/public/customer/by-plate
// @access  Public
const getCustomerByPlate = asyncHandler(async (req, res) => {
  const { plate } = req.query;

  if (!plate) {
    return res.status(400).json({ message: 'Vehicle plate is required' });
  }

  const [customers] = await pool.query(
    'SELECT * FROM customers WHERE vehicle_plate = ?',
    [plate]
  );

  if (customers.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  const customer = customers[0];
  let wash_stamps = 0;

  try {
    wash_stamps = await getWashStamps(pool, customer.id);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') {
      throw err;
    }
  }

  res.json({
    customer: { ...customer, wash_stamps },
    loyalty: { wash_stamps, free_wash_ready: wash_stamps >= 5 },
  });
});

// @desc    Get customer by ID (public)
// @route   GET /api/public/customer/by-id
// @access  Public
const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Customer ID is required' });
  }

  const [customers] = await pool.query(
    'SELECT * FROM customers WHERE id = ?',
    [id]
  );

  if (customers.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  const customer = customers[0];
  let wash_stamps = 0;

  try {
    wash_stamps = await getWashStamps(pool, customer.id);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') {
      throw err;
    }
  }

  res.json({
    customer: { ...customer, wash_stamps },
    loyalty: { wash_stamps, free_wash_ready: wash_stamps >= 5 },
  });
});

module.exports = {
  getCustomerByPlate,
  getCustomerById
};

