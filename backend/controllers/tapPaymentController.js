const tapService = require('../services/tapService');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl } = require('../utils/customerLinkUtils');
const { ensureLoyaltyRow, incrementWashStamp } = require('../utils/loyaltyStamps');

// @desc    Initiate Tap Payment (Create Charge)
// @route   POST /api/payments/tap/create OR POST /api/public/payments/tap/create
// @access  Public / Private
const initiateTapPayment = asyncHandler(async (req, res) => {
  const { order_id, amount, redirect_url } = req.body;

  if (!order_id || !amount || !redirect_url) {
    return res.status(400).json({ message: 'Order ID, amount, and redirect_url are required' });
  }

  try {
    // 1. Fetch Order and Customer details from database
    const [orderRows] = await pool.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone 
       FROM orders o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       WHERE o.id = ?`,
      [order_id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRows[0];

    // 2. Prepare callback URL pointing to backend
    // When Tap finishes, it redirects to backend callback with tap_id and final frontend redirect_url
    const backendHost = req.get('host');
    const protocol = req.protocol;
    const backendCallbackUrl = `${protocol}://${backendHost}/api/public/payments/tap-callback?redirect_url=${encodeURIComponent(redirect_url)}&order_id=${order_id}`;

    // 3. Call Tap Service to create charge
    const charge = await tapService.createCharge({
      amount: amount,
      orderId: order_id,
      customerName: order.customer_name || 'Walk-in Customer',
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      redirectUrl: backendCallbackUrl
    });

    res.json({
      charge_id: charge.id,
      transaction_url: charge.transaction.url
    });
  } catch (error) {
    console.error('[Tap Controller Error] Initiation failed:', error);
    res.status(400).json({ message: 'Tap Payment initiation failed', error: error.message });
  }
});

// @desc    Handle Tap Payment Callback (Verification & DB Update)
// @route   GET /api/public/payments/tap-callback
// @access  Public
const handleTapCallback = asyncHandler(async (req, res) => {
  const { tap_id, redirect_url, order_id } = req.query;

  if (!tap_id || !redirect_url || !order_id) {
    return res.status(400).send('Missing required callback parameters');
  }

  let finalRedirectUrl = redirect_url;

  try {
    // 1. Check if payment is already recorded in the database to prevent duplicate processing
    // Note: We use stripe_payment_id column to store Tap's charge ID to avoid DB schema alterations
    const [existingPayments] = await pool.query(
      'SELECT id FROM payments WHERE stripe_payment_id = ? AND status = "completed"',
      [tap_id]
    );

    if (existingPayments.length > 0) {
      console.log(`[Tap Callback] Charge ${tap_id} already processed. Redirecting user.`);
      return res.redirect(`${finalRedirectUrl}${finalRedirectUrl.includes('?') ? '&' : '?'}status=success&order_id=${order_id}`);
    }

    // 2. Fetch charge details from Tap API to verify status
    const charge = await tapService.getCharge(tap_id);
    const chargeStatus = charge.status;

    if (chargeStatus === 'CAPTURED') {
      const amount = charge.amount;
      const method = charge.source?.payment_method || 'card';

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // 3. Record payment in the database
        await connection.query(
          'INSERT INTO payments (order_id, amount, method, status, stripe_payment_id) VALUES (?, ?, ?, ?, ?)',
          [order_id, amount, method, 'completed', tap_id]
        );

        // 4. Fetch current order details
        const [orders] = await connection.query(
          'SELECT status, service_completed_at, total, vip_booking_id, customer_id, source FROM orders WHERE id = ?',
          [order_id]
        );

        if (orders.length > 0) {
          const order = orders[0];
          const isAlreadyCompleted = order.status === 'completed';

          // 5. Determine items and status (Services vs Products)
          const [items] = await connection.query(
            'SELECT oi.*, p.category FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
            [order_id]
          );
          const hasService = items.length === 0 || items.some(item => item.category === 'Services');
          const targetStatus = isAlreadyCompleted ? 'completed' : (hasService ? 'processing' : 'completed');
          const serviceCompletedAt = targetStatus === 'completed' ? (order.service_completed_at || new Date()) : null;

          const orderTotal = parseFloat(order.total);

          // Calculate total paid
          const [payments] = await connection.query(
            'SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ? AND status = "completed"',
            [order_id]
          );
          const totalPaid = parseFloat(payments[0].total_paid || 0);
          const newPaymentStatus = totalPaid >= orderTotal ? 'paid' : 'partial';

          await connection.query(
            'UPDATE orders SET payment_status = ?, status = ?, service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP), service_completed_at = COALESCE(?, service_completed_at) WHERE id = ?',
            [newPaymentStatus, targetStatus, serviceCompletedAt, order_id]
          );

          // Update service status if order has services and is not already completed
          if (hasService && !isAlreadyCompleted) {
            await connection.query(
              'UPDATE services SET status = "in_progress", started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE order_id = ?',
              [order_id]
            );
          }

          // Handle VIP Booking updates
          if (order.vip_booking_id) {
            await connection.query(
              'UPDATE vip_bookings SET status = ? WHERE id = ?',
              [newPaymentStatus === 'paid' ? 'confirmed' : 'pending', order.vip_booking_id]
            );

            if (newPaymentStatus === 'paid' && !isAlreadyCompleted) {
              await connection.query(
                `UPDATE orders 
                 SET status = 'processing', 
                     service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP) 
                 WHERE id = ?`,
                [order_id]
              );
              await connection.query(
                `UPDATE vip_bookings SET status = 'in_progress' WHERE id = ?`,
                [order.vip_booking_id]
              );
              console.log(`[VIP] Auto-started VIP service booking ${order.vip_booking_id} after Tap payment`);
            }
          }
        }

        await connection.commit();
        connection.release();

        console.log(`[Tap Callback] Successful payment captured for order ${order_id}`);
        return res.redirect(`${finalRedirectUrl}${finalRedirectUrl.includes('?') ? '&' : '?'}status=success&order_id=${order_id}`);
      } catch (dbError) {
        await connection.rollback();
        connection.release();
        if (dbError.code === 'ER_DUP_ENTRY') {
          console.log(`[Tap Callback] Concurrently processed charge ${tap_id} already registered. Redirecting to success.`);
          return res.redirect(`${finalRedirectUrl}${finalRedirectUrl.includes('?') ? '&' : '?'}status=success&order_id=${order_id}`);
        }
        throw dbError;
      }
    } else {
      console.log(`[Tap Callback] Payment status is not CAPTURED: ${chargeStatus}`);
      return res.redirect(`${finalRedirectUrl}${finalRedirectUrl.includes('?') ? '&' : '?'}status=failed&error=${chargeStatus}&order_id=${order_id}`);
    }
  } catch (error) {
    console.error('[Tap Callback Error] Handling failed:', error);
    return res.redirect(`${finalRedirectUrl}${finalRedirectUrl.includes('?') ? '&' : '?'}status=failed&error=${encodeURIComponent(error.message)}&order_id=${order_id}`);
  }
});

module.exports = {
  initiateTapPayment,
  handleTapCallback
};
