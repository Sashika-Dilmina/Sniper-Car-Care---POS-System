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

// @desc    Get customer orders (public)
// @route   GET /api/public/customer/orders
// @access  Public
const getCustomerOrders = asyncHandler(async (req, res) => {
  const { plate, id } = req.query;

  if (!plate && !id) {
    return res.status(400).json({ message: 'Customer ID or Vehicle plate is required' });
  }

  let customerId = id;

  if (!customerId) {
    const [customers] = await pool.query(
      'SELECT id FROM customers WHERE vehicle_plate = ?',
      [plate]
    );
    if (customers.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    customerId = customers[0].id;
  }

  const [orders] = await pool.query(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );

  // Fetch items for each order
  const orderIds = orders.map(o => o.id);
  let allItems = [];
  
  if (orderIds.length > 0) {
    const [items] = await pool.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id IN (?)',
      [orderIds]
    );
    allItems = items;
  }

  const formattedOrders = orders.map(order => ({
    ...order,
    items: allItems.filter(item => item.order_id === order.id)
  }));

  res.json({
    orders: formattedOrders
  });
});

module.exports = {
  getCustomerByPlate,
  getCustomerById,
  getCustomerOrders
};

