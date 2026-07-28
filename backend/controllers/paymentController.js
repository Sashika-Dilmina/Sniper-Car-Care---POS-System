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
          'SELECT total, status, vip_booking_id FROM orders WHERE id = ?',
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

          // If payment status becomes "paid", automatically start VIP service if it's a VIP booking (only if order is not completed)
          if (newPaymentStatus === 'paid' && orders[0].vip_booking_id !== null && orders[0].vip_booking_id !== undefined && orders[0].status !== 'completed') {
            await connection.query(
              `UPDATE orders 
               SET status = 'processing', 
                   service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP) 
               WHERE id = ?`,
              [order_id]
            );
            await connection.query(
              `UPDATE vip_bookings SET status = 'in_progress' WHERE id = ?`,
              [orders[0].vip_booking_id]
            );
            console.log(`[VIP] Auto-started service for VIP booking ${orders[0].vip_booking_id} after Stripe payment`);
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
        if (error.code === 'ER_DUP_ENTRY') {
          return res.json({
            message: 'Payment confirmed successfully',
            payment_intent: paymentIntent
          });
        }
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
  const { order_id, amount, method, status = 'completed', discount = 0, splits } = req.body;

  if (!order_id || amount === undefined || !method) {
    return res.status(400).json({ message: 'Order ID, amount, and method are required' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const discountVal = parseFloat(discount || 0);
    if (discountVal > 0) {
      const [orderRows] = await connection.query(
        'SELECT total, discount FROM orders WHERE id = ?',
        [order_id]
      );
      if (orderRows.length > 0) {
        const currentTotal = parseFloat(orderRows[0].total);
        const currentDiscount = parseFloat(orderRows[0].discount || 0);
        
        const newTotal = Math.max(0, currentTotal - discountVal);
        const newDiscount = currentDiscount + discountVal;
        
        await connection.query(
          'UPDATE orders SET total = ?, discount = ? WHERE id = ?',
          [newTotal, newDiscount, order_id]
        );
      }
    }

    if (method === 'multiple' && Array.isArray(splits) && splits.length > 0) {
      // Process multiple split payments
      for (const split of splits) {
        const splitAmt = parseFloat(split.amount || 0);
        if (splitAmt > 0 && split.method) {
          // Check for duplicate insert in last 10 seconds
          const [recentDup] = await connection.query(
            'SELECT id FROM payments WHERE order_id = ? AND method = ? AND amount = ? AND status = "completed" AND created_at >= TIMESTAMPADD(SECOND, -10, CURRENT_TIMESTAMP) LIMIT 1',
            [order_id, split.method, splitAmt]
          );

          if (recentDup.length === 0) {
            await connection.query(
              'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
              [order_id, splitAmt, split.method, status]
            );
          }
        }
      }
    } else {
      // Check for duplicate single payment insert in last 10 seconds
      const [recentDup] = await connection.query(
        'SELECT id FROM payments WHERE order_id = ? AND method = ? AND amount = ? AND status = "completed" AND created_at >= TIMESTAMPADD(SECOND, -10, CURRENT_TIMESTAMP) LIMIT 1',
        [order_id, method, amount]
      );

      if (recentDup.length === 0) {
        // Check if there is an existing pending payment record
        const [pendingPayments] = await connection.query(
          'SELECT id FROM payments WHERE order_id = ? AND status = "pending" LIMIT 1',
          [order_id]
        );

        if (pendingPayments.length > 0 && status === 'completed') {
          // Update existing pending payment to completed
          await connection.query(
            'UPDATE payments SET amount = ?, method = ?, status = "completed" WHERE id = ?',
            [amount, method, pendingPayments[0].id]
          );
        } else {
          // Record payment
          await connection.query(
            'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
            [order_id, amount, method, status]
          );
        }
      }
    }

    // Update order payment status
    const [orders] = await connection.query(
      'SELECT total, status, vip_booking_id FROM orders WHERE id = ?',
      [order_id]
    );

    if (orders.length > 0) {
      const orderTotal = parseFloat(orders[0].total);
      const [payments] = await connection.query(
        'SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ? AND status = "completed"',
        [order_id]
      );

      const totalPaid = parseFloat(payments[0].total_paid || 0);

      const isFreeWash = method === 'free' || orderTotal === 0;
      const newPaymentStatus = isFreeWash ? 'free' : (totalPaid >= orderTotal ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending'));
      await connection.query(
        'UPDATE orders SET payment_status = ? WHERE id = ?',
        [newPaymentStatus, order_id]
      );

      // If payment status becomes "paid", automatically start VIP service if it's a VIP booking (only if order is not completed)
      if (newPaymentStatus === 'paid' && orders[0].vip_booking_id !== null && orders[0].vip_booking_id !== undefined && orders[0].status !== 'completed') {
        await connection.query(
          `UPDATE orders 
           SET status = 'processing', 
               service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP) 
           WHERE id = ?`,
          [order_id]
        );
        await connection.query(
          `UPDATE vip_bookings SET status = 'in_progress' WHERE id = ?`,
          [orders[0].vip_booking_id]
        );
        console.log(`[VIP] Auto-started service for VIP booking ${orders[0].vip_booking_id} after manual payment`);
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

