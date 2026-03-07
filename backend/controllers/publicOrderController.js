const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl } = require('../utils/customerLinkUtils');

// @desc    Create order from customer website
// @route   POST /api/public/orders
// @access  Public
const createOrder = asyncHandler(async (req, res) => {
  const { customer_id, customer_name, customer_phone, vehicle_plate, items, total, source, notes, status, payment_status } = req.body;

  // Allow orders without items for service bookings
  if (items === undefined) {
    return res.status(400).json({ message: 'Items field is required' });
  }

  if (!total) {
    return res.status(400).json({ message: 'Total amount is required' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // If vehicle_plate provided but no customer_id, try to find or create customer
    let finalCustomerId = customer_id;

    if (!finalCustomerId && vehicle_plate) {
      const [customers] = await connection.query(
        'SELECT id FROM customers WHERE vehicle_plate = ?',
        [vehicle_plate]
      );
      if (customers.length > 0) {
        finalCustomerId = customers[0].id;
      }
    }

    // If still no customer ID but we have name and phone, create new customer
    // Note: vehicle_plate is required in schema, so we only create customer if vehicle_plate is provided
    // Determine vehicle type from order notes (if it mentions 4x4) or default to Saloon
    let vehicleType = 'Saloon';
    if (notes && (notes.toLowerCase().includes('4x4') || notes.toLowerCase().includes('(4x4)'))) {
      vehicleType = '4x4';
    }

    // If customer already exists, use their vehicle type
    if (finalCustomerId) {
      const [existingCustomer] = await connection.query(
        'SELECT vehicle_type FROM customers WHERE id = ?',
        [finalCustomerId]
      );
      if (existingCustomer.length > 0) {
        vehicleType = existingCustomer[0].vehicle_type;
      }
    }

    if (!finalCustomerId && customer_name && customer_phone && vehicle_plate) {
      try {
        const [newCustomer] = await connection.query(
          'INSERT INTO customers (name, phone, vehicle_plate, vehicle_type) VALUES (?, ?, ?, ?)',
          [customer_name, customer_phone, vehicle_plate, vehicleType]
        );
        finalCustomerId = newCustomer.insertId;
      } catch (error) {
        // If customer already exists (duplicate vehicle_plate), try to fetch it
        if (error.code === 'ER_DUP_ENTRY') {
          const [customers] = await connection.query(
            'SELECT id FROM customers WHERE vehicle_plate = ?',
            [vehicle_plate]
          );
          if (customers.length > 0) {
            finalCustomerId = customers[0].id;
          }
        } else {
          throw error;
        }
      }
    }

    // Create order with notes - include customer info in notes if no customer_id
    let orderNotes = notes || '';
    if (!finalCustomerId && customer_name) {
      const customerInfo = `Customer: ${customer_name}${customer_phone ? ` (${customer_phone})` : ''}${vehicle_plate ? ` - Vehicle: ${vehicle_plate}` : ''}`;
      orderNotes = orderNotes ? `${customerInfo}\n${orderNotes}` : customerInfo;
    }

    // Create order with notes
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_id, total, discount, status, payment_status, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        finalCustomerId || null,
        total,
        0,
        status || 'pending',
        payment_status || 'pending',
        source || 'customer_website',
        orderNotes || null
      ]
    );

    const orderId = orderResult.insertId;

    // Create order items and update stock (only if items provided)
    if (items && items.length > 0) {
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
    }

    await connection.commit();

    const [newOrder] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    connection.release();

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder[0]
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
});

// @desc    Get order by ID (public)
// @route   GET /api/public/order/:id or /api/public/orders/:id
// @access  Public
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [orders] = await pool.query(`
    SELECT o.*, 
           c.name as customer_name,
           c.phone as customer_phone,
           c.vehicle_plate
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [id]);

  if (orders.length === 0) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const order = orders[0];
  const [items] = await pool.query(
    'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
    [id]
  );

  res.json({
    order: {
      ...order,
      items
    }
  });
});

// @desc    Confirm order (mark as processing)
// @route   POST /api/public/orders/confirm
// @access  Public
const confirmOrder = asyncHandler(async (req, res) => {
  const { order_id, payment_method } = req.body;

  await pool.query(
    'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
    ['processing', payment_method === 'cash' ? 'pending' : 'paid', order_id]
  );

  res.json({ message: 'Order confirmed successfully' });
});

// @desc    Create payment intent
// @route   POST /api/public/payments/create-intent
// @access  Public
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { order_id, amount, payment_method } = req.body;

  if (!order_id || !amount) {
    return res.status(400).json({ message: 'Order ID and amount are required' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'aed',
      payment_method_types: payment_method ? [payment_method] : ['card'],
      metadata: {
        order_id: order_id.toString()
      }
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
  } catch (error) {
    res.status(400).json({ message: 'Payment intent creation failed', error: error.message });
  }
});

// @desc    Confirm payment
// @route   POST /api/public/payments/confirm
// @access  Public
const confirmPayment = asyncHandler(async (req, res) => {
  const { order_id, payment_intent_id, amount, method } = req.body;

  if (!order_id || !payment_intent_id || !amount) {
    return res.status(400).json({ message: 'Order ID, payment intent ID, and amount are required' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Record payment
        await connection.query(
          'INSERT INTO payments (order_id, amount, method, status, stripe_payment_id) VALUES (?, ?, ?, ?, ?)',
          [order_id, amount, method || 'card', 'completed', payment_intent_id]
        );

        // Update order payment status
        await connection.query(
          'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
          ['paid', 'processing', order_id]
        );

        // Send Feedback SMS
        const [orderData] = await connection.query(`
          SELECT o.id, c.name, c.phone, c.vehicle_plate, c.vehicle_type, c.id as customer_id
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          WHERE o.id = ?
        `, [order_id]);

        if (orderData.length > 0) {
          const order = orderData[0];
          const phone = formatPhoneNumber(order.phone);
          const feedbackUrl = buildFeedbackUrl({
            vehicleType: order.vehicle_type || 'Saloon',
            customerId: order.customer_id,
            plate: order.vehicle_plate,
            orderId: order.id
          });

          if (phone) {
            try {
              await sendReson8Message({
                to: phone,
                message: `Thank you for your payment at Sniper Car Care. We hope you liked our service! Please leave your feedback here: ${feedbackUrl}`,
                campaignName: 'PUBLIC_PAYMENT_FEEDBACK'
              });
              console.log(`[SMS] Feedback SMS sent to ${phone} after public payment for order ${order_id}`);
            } catch (err) {
              console.error('[SMS] Feedback SMS failed:', err.message);
            }
          }
        }

        await connection.commit();
        connection.release();

        res.json({
          message: 'Payment confirmed successfully'
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } else {
      res.status(400).json({ message: 'Payment not succeeded', status: paymentIntent.status });
    }
  } catch (error) {
    res.status(400).json({ message: 'Payment confirmation failed', error: error.message });
  }
});

module.exports = {
  createOrder,
  getOrder,
  confirmOrder,
  createPaymentIntent,
  confirmPayment
};

