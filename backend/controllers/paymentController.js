const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl } = require('../utils/customerLinkUtils');

// @desc    Create payment intent
// @route   POST /api/payments/create-intent
// @access  Private
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { order_id, amount, payment_method } = req.body;

  if (!order_id || !amount) {
    return res.status(400).json({ message: 'Order ID and amount are required' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
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
// @route   POST /api/payments/confirm
// @access  Private
const confirmPayment = asyncHandler(async (req, res) => {
  const { order_id, payment_intent_id, amount, method } = req.body;

  if (!order_id || !payment_intent_id || !amount) {
    return res.status(400).json({ message: 'Order ID, payment intent ID, and amount are required' });
  }

  try {
    // Confirm payment with Stripe
    const paymentIntent = await stripe.paymentIntents.confirm(payment_intent_id);

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
        const [orders] = await connection.query(
          'SELECT total FROM orders WHERE id = ?',
          [order_id]
        );

        if (orders.length > 0) {
          const orderTotal = parseFloat(orders[0].total);
          const [payments] = await connection.query(
            'SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ? AND status = "completed"',
            [order_id]
          );

          const totalPaid = parseFloat(payments[0].total_paid || 0) + parseFloat(amount);

          const newPaymentStatus = totalPaid >= orderTotal ? 'paid' : 'partial';
          await connection.query(
            'UPDATE orders SET payment_status = ? WHERE id = ?',
            [newPaymentStatus, order_id]
          );

          // If payment status becomes "paid", send Feedback SMS
          if (newPaymentStatus === 'paid') {
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
                    campaignName: 'PAYMENT_FEEDBACK'
                  });
                  console.log(`[SMS] Feedback SMS sent to ${phone} after payment for order ${order_id}`);
                } catch (err) {
                  console.error('[SMS] Feedback SMS failed:', err.message);
                }
              }
            }
          }
        }

        await connection.commit();
        connection.release();

        res.json({
          message: 'Payment confirmed successfully',
          payment_intent: paymentIntent
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

// @desc    Get payments for order
// @route   GET /api/payments/order/:order_id
// @access  Private
const getOrderPayments = asyncHandler(async (req, res) => {
  const { order_id } = req.params;

  const [payments] = await pool.query(
    'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC',
    [order_id]
  );

  res.json({ payments });
});

// @desc    Process manual payment (cash, etc.)
// @route   POST /api/payments/manual
// @access  Private
const processManualPayment = asyncHandler(async (req, res) => {
  const { order_id, amount, method } = req.body;

  if (!order_id || !amount || !method) {
    return res.status(400).json({ message: 'Order ID, amount, and method are required' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Record payment
    await connection.query(
      'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
      [order_id, amount, method, 'completed']
    );

    // Update order payment status
    const [orders] = await connection.query(
      'SELECT total FROM orders WHERE id = ?',
      [order_id]
    );

    if (orders.length > 0) {
      const orderTotal = parseFloat(orders[0].total);
      const [payments] = await connection.query(
        'SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ? AND status = "completed"',
        [order_id]
      );

      const totalPaid = parseFloat(payments[0].total_paid || 0) + parseFloat(amount);

      const newPaymentStatus = totalPaid >= orderTotal ? 'paid' : 'partial';
      await connection.query(
        'UPDATE orders SET payment_status = ? WHERE id = ?',
        [newPaymentStatus, order_id]
      );

      // If payment status becomes "paid", send Feedback SMS
      if (newPaymentStatus === 'paid') {
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
                campaignName: 'PAYMENT_FEEDBACK'
              });
              console.log(`[SMS] Feedback SMS sent to ${phone} after manual payment for order ${order_id}`);
            } catch (err) {
              console.error('[SMS] Feedback SMS failed:', err.message);
            }
          }
        }
      }
    }

    await connection.commit();
    connection.release();

    res.json({ message: 'Manual payment processed successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
});

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getOrderPayments,
  processManualPayment
};

