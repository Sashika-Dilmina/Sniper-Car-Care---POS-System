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

  // Get customer phone number to search for associated VIP bookings
  let phone = null;
  const [custRows] = await pool.query('SELECT phone FROM customers WHERE id = ?', [customerId]);
  if (custRows.length > 0) {
    phone = custRows[0].phone;
  }

  let query = 'SELECT * FROM orders WHERE customer_id = ?';
  let queryParams = [customerId];

  if (phone) {
    query += ` OR vip_booking_id IN (
      SELECT vb.id 
      FROM vip_bookings vb 
      JOIN vip_customers vc ON vb.vip_customer_id = vc.id 
      WHERE vc.phone = ?
    )`;
    queryParams.push(phone);
  }
  
  query += ' ORDER BY created_at DESC';
  const [orders] = await pool.query(query, queryParams);

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

// @desc    Get notifications for customer (public)
// @route   GET /api/public/customer/notifications
// @access  Public
const getCustomerNotifications = asyncHandler(async (req, res) => {
  const { plate } = req.query;

  if (!plate) {
    return res.status(400).json({ message: 'Vehicle plate is required' });
  }

  const [notifications] = await pool.query(
    'SELECT * FROM customer_notifications WHERE vehicle_plate = ? ORDER BY created_at DESC LIMIT 50',
    [plate]
  );

  res.json({
    success: true,
    notifications
  });
});

// @desc    Mark customer notifications as read (public)
// @route   POST /api/public/customer/notifications/mark-read
// @access  Public
const markNotificationsAsRead = asyncHandler(async (req, res) => {
  const { plate } = req.body;

  if (!plate) {
    return res.status(400).json({ message: 'Vehicle plate is required' });
  }

  await pool.query(
    'UPDATE customer_notifications SET is_read = 1 WHERE vehicle_plate = ? AND is_read = 0',
    [plate]
  );

  res.json({
    success: true,
    message: 'Notifications marked as read'
  });
});

module.exports = {
  getCustomerByPlate,
  getCustomerById,
  getCustomerOrders,
  getCustomerNotifications,
  markNotificationsAsRead
};

