const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl, buildPaymentUrl } = require('../utils/customerLinkUtils');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const { status, payment_status, customer_id, date, service_time } = req.query;
  let query = `
    SELECT o.*, 
           COALESCE(c.name, vc.name) as customer_name, 
           COALESCE(c.phone, vc.phone) as customer_phone,
           COALESCE(c.vehicle_plate, vc.vehicle_model) as vehicle_plate,
           COALESCE(c.vehicle_type, vc.vehicle_type) as vehicle_type,
           cc.status as credit_status,
           cc.remaining_amount as credit_remaining,
           -- Service time: Duration from service start to service completion
           -- Start: o.service_started_at
           -- End: o.service_completed_at
           -- Fallback: If service timestamps are null, use the difference between first payment completion and order completion
            CASE 
              -- Bypasses service time calculation for product-only orders
              WHEN NOT EXISTS (
                SELECT 1 FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = o.id AND p.category = 'Services'
              ) AND EXISTS (
                SELECT 1 FROM order_items oi2 WHERE oi2.order_id = o.id
              ) THEN NULL
              WHEN o.service_started_at IS NOT NULL AND o.service_completed_at IS NOT NULL THEN
                TIMESTAMPDIFF(MINUTE, o.service_started_at, o.service_completed_at)
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
    LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
    LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN customer_credits cc ON o.id = cc.order_id
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
  } else if (req.user && req.user.role === 'staff') {
    query += ' AND DATE(o.created_at) = CURDATE()';
  }

  // Filter by service time at SQL level
  if (service_time === 'fast') {
    query += ` AND o.status = 'completed' 
               AND (
                 (o.service_started_at IS NOT NULL AND o.service_completed_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, o.service_started_at, o.service_completed_at) < 30)
                 OR
                 (o.service_started_at IS NULL AND EXISTS (
                   SELECT 1 FROM payments p 
                   WHERE p.order_id = o.id AND p.status = 'completed'
                 ) AND TIMESTAMPDIFF(MINUTE, 
                   (SELECT MIN(p.created_at) 
                    FROM payments p 
                    WHERE p.order_id = o.id AND p.status = 'completed'), 
                   o.updated_at
                 ) < 30)
               )`;
  } else if (service_time === 'slow') {
    query += ` AND o.status = 'completed' 
               AND (
                 (o.service_started_at IS NOT NULL AND o.service_completed_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, o.service_started_at, o.service_completed_at) >= 30)
                 OR
                 (o.service_started_at IS NULL AND EXISTS (
                   SELECT 1 FROM payments p 
                   WHERE p.order_id = o.id AND p.status = 'completed'
                 ) AND TIMESTAMPDIFF(MINUTE, 
                   (SELECT MIN(p.created_at) 
                    FROM payments p 
                    WHERE p.order_id = o.id AND p.status = 'completed'), 
                   o.updated_at
                 ) >= 30)
               )`;
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
           COALESCE(c.name, vc.name) as customer_name, 
           COALESCE(c.phone, vc.phone) as customer_phone,
           COALESCE(c.vehicle_plate, vc.vehicle_model) as vehicle_plate,
           COALESCE(c.vehicle_type, vc.vehicle_type) as vehicle_type,
           cc.status as credit_status,
           cc.remaining_amount as credit_remaining
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
    LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN customer_credits cc ON o.id = cc.order_id
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
    // Verify stock and check if any product is a service
    let hasService = false;
    for (let item of items) {
      const [prodRows] = await connection.query('SELECT name, stock, category FROM products WHERE id = ?', [item.product_id]);
      if (prodRows.length > 0) {
        const prod = prodRows[0];
        const isService = prod.category === 'Services' || prod.category === 'VIP';
        if (isService) {
          hasService = true;
        } else {
          // Verify stock limit
          if (prod.stock < item.quantity) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: `Insufficient stock for product ${prod.name}. Available: ${prod.stock}` });
          }
        }
      }
    }

    const orderStatus = hasService ? 'processing' : 'completed';
    const serviceStartedAt = hasService ? new Date() : null;
    const serviceCompletedAt = hasService ? null : new Date();

    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_id, total, discount, status, payment_status, service_started_at, service_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer_id || null, total, discount || 0, orderStatus, 'pending', serviceStartedAt, serviceCompletedAt]
    );

    const orderId = orderResult.insertId;

    // Fetch customer vehicle type if customer_id exists
    let vehicleType = 'Saloon';
    if (customer_id) {
      const [custRows] = await connection.query('SELECT vehicle_type FROM customers WHERE id = ?', [customer_id]);
      if (custRows.length > 0 && custRows[0].vehicle_type) {
        const val = custRows[0].vehicle_type.toString().trim();
        if (val === 'Saloon' || val === '4x4') {
          vehicleType = val;
        } else if (val.toLowerCase().includes('4x4') || val.toLowerCase().includes('4-wheel') || val.toLowerCase().includes('4wheel')) {
          vehicleType = '4x4';
        }
      }
    }

    // Create order items and update stock
    for (let item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      const [prodRows] = await connection.query('SELECT category, name FROM products WHERE id = ?', [item.product_id]);
      const isService = prodRows.length > 0 && (prodRows[0].category === 'Services' || prodRows[0].category === 'VIP');

      // Update product stock (only for non-service items)
      if (!isService) {
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Check if item is a service, and create service task
      if (isService) {
        await connection.query(
          'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, started_at, order_id) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)',
          [customer_id || null, prodRows[0].name, vehicleType, item.price, 'Added via POS Order', 'in_progress', orderId]
        );
      }
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

  if (status === 'completed') {
    const [openRegisters] = await pool.query(
      'SELECT id FROM cash_registers WHERE status = "open" LIMIT 1'
    );
    if (openRegisters.length === 0) {
      return res.status(400).json({ 
        message: 'Cannot complete order. There is no active cash register session open. Please open the register first.' 
      });
    }
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Update order status in database with corresponding timestamps
    let statusUpdateQuery = 'UPDATE orders SET status = ? WHERE id = ?';
    let statusUpdateParams = [status, id];

    if (status === 'processing') {
      statusUpdateQuery = 'UPDATE orders SET status = ?, service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP) WHERE id = ?';
    } else if (status === 'completed') {
      statusUpdateQuery = 'UPDATE orders SET status = ?, service_completed_at = COALESCE(service_completed_at, CURRENT_TIMESTAMP) WHERE id = ?';
    }

    await connection.query(statusUpdateQuery, statusUpdateParams);

    // 2. Fetch order details to see if payment needs to be completed
    const [orders] = await connection.query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             c.vehicle_plate, c.vehicle_type, c.id as customer_id_ref
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [id]);

    if (orders.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // Sync status to VIP bookings if linked
    if (order.vip_booking_id) {
      let vipStatus = 'pending';
      if (status === 'processing') vipStatus = 'in_progress';
      else if (status === 'completed') vipStatus = 'completed';
      else if (status === 'cancelled') vipStatus = 'cancelled';

      await connection.query(
        'UPDATE vip_bookings SET status = ? WHERE id = ?',
        [vipStatus, order.vip_booking_id]
      );
    }

    // Sync status and timestamps to associated services
    let serviceStatus = 'pending';
    let serviceStartedUpdate = '';
    let serviceCompletedUpdate = '';
    
    if (status === 'processing') {
      serviceStatus = 'in_progress';
      serviceStartedUpdate = ', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)';
    } else if (status === 'completed') {
      serviceStatus = 'completed';
      serviceStartedUpdate = ', started_at = COALESCE(started_at, created_at, CURRENT_TIMESTAMP)';
      serviceCompletedUpdate = ', completed_at = CURRENT_TIMESTAMP';
    } else if (status === 'cancelled') {
      serviceStatus = 'cancelled';
    } else if (status === 'pending') {
      serviceStatus = 'pending';
      serviceStartedUpdate = ', started_at = NULL';
      serviceCompletedUpdate = ', completed_at = NULL';
    }

    if (status === 'completed' && order.customer_id_ref) {
      const [pendingServices] = await connection.query(
        'SELECT id FROM services WHERE order_id = ? AND status != "completed"',
        [id]
      );
      if (pendingServices.length > 0) {
        const pointsToAdd = pendingServices.length * 25;
        const [loyaltyRows] = await connection.query(
          'SELECT points FROM loyalty WHERE customer_id = ?',
          [order.customer_id_ref]
        );
        if (loyaltyRows.length > 0) {
          await connection.query(
            'UPDATE loyalty SET points = points + ? WHERE customer_id = ?',
            [pointsToAdd, order.customer_id_ref]
          );
        } else {
          await connection.query(
            'INSERT INTO loyalty (customer_id, points) VALUES (?, ?)',
            [order.customer_id_ref, pointsToAdd]
          );
        }
        console.log(`[Loyalty] Awarded ${pointsToAdd} points to customer ${order.customer_id_ref} for completing ${pendingServices.length} services in order ${id}`);
      }
    }

    await connection.query(
      `UPDATE services SET status = ?${serviceStartedUpdate}${serviceCompletedUpdate} WHERE order_id = ?`,
      [serviceStatus, id]
    );

    // If order status is set to 'completed', automatically handle payment status and record cash payments if unpaid
    if (status === 'completed') {
      // Check if this order is linked to a customer credit
      const [creditRecords] = await connection.query(
        'SELECT id FROM customer_credits WHERE order_id = ?',
        [id]
      );
      const hasCredit = creditRecords.length > 0;

      if (!hasCredit && order.payment_status !== 'paid' && order.payment_status !== 'free') {
        const [payments] = await connection.query(
          'SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ? AND status = "completed"',
          [id]
        );
        const totalPaid = parseFloat(payments[0].total_paid || 0);
        const remaining = parseFloat(order.total) - totalPaid;

        if (remaining > 0) {
          // Check if there is a pending cash or card payment record we can complete
          const [pendingPayments] = await connection.query(
            'SELECT id, method FROM payments WHERE order_id = ? AND status = "pending"',
            [id]
          );

          if (pendingPayments.length > 0) {
            // Update existing pending payment record
            await connection.query(
              'UPDATE payments SET status = "completed", amount = ? WHERE id = ?',
              [order.total, pendingPayments[0].id]
            );
          } else {
            // Insert a new completed cash payment record
            await connection.query(
              'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
              [id, remaining, 'cash', 'completed']
            );
          }

          // Update order payment status to paid
          await connection.query(
            'UPDATE orders SET payment_status = "paid" WHERE id = ?',
            [id]
          );
          order.payment_status = 'paid';
        }
      }

      // Handle Loyalty Stamps for Website Bookings only upon completion
      const isWebsiteServiceBooking = 
        order.customer_id_ref &&
        (order.source === 'customer_website_saloon' ||
         order.source === 'customer_website_4x4' ||
         (order.source || '').includes('customer_website'));
         
      const [serviceRows] = await connection.query(
        'SELECT id FROM services WHERE order_id = ? LIMIT 1',
        [id]
      );
      const hasService = serviceRows.length > 0;

      if (isWebsiteServiceBooking && parseFloat(order.total) > 0 && hasService) {
        const { ensureLoyaltyRow, incrementWashStamp } = require('../utils/loyaltyStamps');
        await ensureLoyaltyRow(connection, order.customer_id_ref);
        await incrementWashStamp(connection, order.customer_id_ref);
      }
    }

    await connection.commit();
    connection.release();

    // Send SMS notifications (Thank You & Feedback URL) when order is marked as completed
    if (status === 'completed') {
      const rawPhone = order.customer_phone;
      const formattedPhone = formatPhoneNumber(rawPhone);

      if (formattedPhone) {
        // Build the feedback URL for customer reviews
        const feedbackUrl = buildFeedbackUrl({
          vehicleType: order.vehicle_type || 'Saloon',
          customerId: order.customer_id_ref || order.customer_id,
          plate: order.vehicle_plate,
          orderId: order.id
        });

        const thankYouMessage = `Thank you for choosing Sniper Car Care. We hope you loved our service! Please leave your feedback here: ${feedbackUrl}`;

        try {
          await sendReson8Message({
            to: formattedPhone,
            message: thankYouMessage,
            campaignName: 'ORDER_COMPLETED_THANK_YOU_FEEDBACK',
          });
          console.log(`[SMS] Thank You & Feedback SMS sent to ${formattedPhone} for order ${id}`);
        } catch (err) {
          console.error('[SMS] Thank You & Feedback SMS failed:', err.message);
        }
      } else {
        console.warn(`[SMS] Skipping feedback SMS for order ${id} – no valid phone number.`);
      }
    }

    // Refetch the fully updated order for response
    const [finalOrderRows] = await pool.query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             c.vehicle_plate, c.vehicle_type,
             cc.status as credit_status,
             cc.remaining_amount as credit_remaining
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN customer_credits cc ON o.id = cc.order_id
      WHERE o.id = ?
    `, [id]);

    res.json({ message: 'Order status updated successfully', order: finalOrderRows[0] });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
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

