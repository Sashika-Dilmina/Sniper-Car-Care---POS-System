const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl } = require('../utils/customerLinkUtils');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const { status, payment_status, customer_id, date, service_time } = req.query;
  let query = `
    SELECT o.*, 
           c.name as customer_name, 
           c.phone as customer_phone,
           c.vehicle_plate,
           -- Service time: Duration from first payment completion to order completion
           -- Start: When customer pays (first completed payment timestamp)
           -- End: When service finishes (order status updated to 'completed', when staff sends completion message)
           CASE 
             WHEN o.status = 'completed' AND EXISTS (
               SELECT 1 FROM payments p 
               WHERE p.order_id = o.id AND p.status = 'completed'
             ) THEN 
               TIMESTAMPDIFF(MINUTE, 
                 (SELECT MIN(p.created_at) 
                  FROM payments p 
                  WHERE p.order_id = o.id AND p.status = 'completed'), 
                 o.updated_at
               )
             ELSE NULL
           END as service_time_minutes
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }

  if (payment_status) {
    query += ' AND o.payment_status = ?';
    params.push(payment_status);
  }

  if (customer_id) {
    query += ' AND o.customer_id = ?';
    params.push(customer_id);
  }

  if (date) {
    query += ' AND DATE(o.created_at) = ?';
    params.push(date);
  }

  // Filter by service time at SQL level
  // Service time = time from first payment completion to order completion
  if (service_time === 'fast') {
    // Orders that completed in less than 30 minutes (from payment to completion)
    query += ` AND o.status = 'completed' 
               AND EXISTS (
                 SELECT 1 FROM payments p 
                 WHERE p.order_id = o.id AND p.status = 'completed'
               )
               AND TIMESTAMPDIFF(MINUTE, 
                 (SELECT MIN(p.created_at) 
                  FROM payments p 
                  WHERE p.order_id = o.id AND p.status = 'completed'), 
                 o.updated_at
               ) < 30`;
  } else if (service_time === 'slow') {
    // Orders that took 30 minutes or more (from payment to completion)
    query += ` AND o.status = 'completed' 
               AND EXISTS (
                 SELECT 1 FROM payments p 
                 WHERE p.order_id = o.id AND p.status = 'completed'
               )
               AND TIMESTAMPDIFF(MINUTE, 
                 (SELECT MIN(p.created_at) 
                  FROM payments p 
                  WHERE p.order_id = o.id AND p.status = 'completed'), 
                 o.updated_at
               ) >= 30`;
  }

  query += ' ORDER BY o.created_at DESC';

  const [orders] = await pool.query(query, params);

  // Get order items for each order
  for (let order of orders) {
    const [items] = await pool.query(`
      SELECT oi.*, p.name as product_name, p.category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);
    order.items = items;
  }

  res.json({ orders });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [orders] = await pool.query(`
    SELECT o.*, 
           c.name as customer_name, 
           c.phone as customer_phone,
           c.vehicle_plate,
           c.vehicle_type
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [id]);

  if (orders.length === 0) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const order = orders[0];

  // Get order items
  const [items] = await pool.query(`
    SELECT oi.*, p.name as product_name, p.category, p.price as unit_price
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [id]);

  order.items = items;

  // Get payments
  const [payments] = await pool.query('SELECT * FROM payments WHERE order_id = ?', [id]);
  order.payments = payments;

  res.json({ order });
});

// @desc    Create order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { customer_id, items, total, discount } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Order items are required' });
  }

  if (!total) {
    return res.status(400).json({ message: 'Total amount is required' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_id, total, discount, status, payment_status) VALUES (?, ?, ?, ?, ?)',
      [customer_id || null, total, discount || 0, 'pending', 'pending']
    );

    const orderId = orderResult.insertId;

    // Create order items and update stock
    for (let item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Update product stock
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await connection.commit();
    connection.release();

    const [newOrder] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);

    res.status(201).json({ message: 'Order created successfully', order: newOrder[0] });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

  const [updated] = await pool.query(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone,
           c.vehicle_plate, c.vehicle_type, c.id as customer_id_ref
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [id]);

  // Send SMS notifications when order is marked as completed
  if (status === 'completed' && updated.length > 0) {
    const order = updated[0];
    const rawPhone = order.customer_phone;
    const formattedPhone = formatPhoneNumber(rawPhone);

    if (formattedPhone) {
      // Build feedback URL using existing utility
      const feedbackUrl = buildFeedbackUrl({
        vehicleType: order.vehicle_type || 'Saloon',
        customerId: order.customer_id_ref,
        plate: order.vehicle_plate,
        orderId: order.id,
      });

      // Completion SMS
      try {
        await sendReson8Message({
          to: formattedPhone,
          message: 'Your service is completed. You may collect your vehicle. Thank you for choosing Sniper Cars Care.',
          campaignName: 'ORDER_COMPLETED',
        });
      } catch (err) {
        console.error('[SMS] Completion SMS failed:', err.message);
      }

      // Feedback SMS
      try {
        await sendReson8Message({
          to: formattedPhone,
          message: `Thank you for visiting Sniper Cars Care. Please provide your feedback: ${feedbackUrl}`,
          campaignName: 'ORDER_FEEDBACK',
        });
      } catch (err) {
        console.error('[SMS] Feedback SMS failed:', err.message);
      }
    } else {
      console.warn(`[SMS] Skipping completion/feedback SMS for order ${id} – no valid phone number.`);
    }
  }

  res.json({ message: 'Order status updated successfully', order: updated[0] });
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Admin only)
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [orders] = await pool.query('SELECT id FROM orders WHERE id = ?', [id]);
  if (orders.length === 0) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Restore stock
    const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
    for (let item of items) {
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Delete order items
    await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);

    // Delete payments
    await connection.query('DELETE FROM payments WHERE order_id = ?', [id]);

    // Delete order
    await connection.query('DELETE FROM orders WHERE id = ?', [id]);

    await connection.commit();
    connection.release();

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
});

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder
};

