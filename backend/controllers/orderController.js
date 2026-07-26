const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl, buildPaymentUrl } = require('../utils/customerLinkUtils');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const { status, payment_status, customer_id, date, service_time, limit } = req.query;
  let query = `
    SELECT o.*, 
           COALESCE(c.name, vc.name) as customer_name, 
           COALESCE(c.phone, vc.phone) as customer_phone,
           COALESCE(c.vehicle_plate, vc.vehicle_model) as vehicle_plate,
           COALESCE(c.vehicle_type, vc.vehicle_type) as vehicle_type,
           cc.status as credit_status,
           cc.remaining_amount as credit_remaining,
           (
             SELECT GROUP_CONCAT(DISTINCT 
               CASE 
                 WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'TAP'
                 WHEN p.method IN ('mastercard', 'master_card', 'master') THEN 'card'
                 ELSE p.method
               END
             )
             FROM payments p 
             WHERE p.order_id = o.id AND p.status = 'completed'
           ) as payment_methods,
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
    if (status === 'pending') {
      query += " AND o.status IN ('pending', 'processing')";
    } else {
      query += ' AND o.status = ?';
      params.push(status);
    }
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
    const [sessions] = await pool.query(
      "SELECT DATE_FORMAT(opened_at, '%Y-%m-%d %H:%i:%s') as opened_at, DATE_FORMAT(closed_at, '%Y-%m-%d %H:%i:%s') as closed_at FROM cash_registers WHERE DATE(opened_at) = ? ORDER BY opened_at ASC",
      [date]
    );
    if (sessions.length > 0) {
      const startTime = sessions[0].opened_at;
      const endTime = sessions[sessions.length - 1].closed_at || `${date} 23:59:59`;
      query += ' AND o.created_at >= ? AND o.created_at <= ?';
      params.push(startTime, endTime);
    } else {
      query += ' AND DATE(o.created_at) = ?';
      params.push(date);
    }
  } else if (req.user && req.user.role === 'staff') {
    const [active] = await pool.query("SELECT DATE_FORMAT(opened_at, '%Y-%m-%d %H:%i:%s') as opened_at FROM cash_registers WHERE status = 'open' LIMIT 1");
    if (active.length > 0) {
      query += ' AND o.created_at >= ?';
      params.push(active[0].opened_at);
    } else {
      query += ' AND DATE(o.created_at) = CURDATE()';
    }
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

  if (limit && !isNaN(limit)) {
    query += ` LIMIT ${parseInt(limit)}`;
  }

  const [orders] = await pool.query(query, params);

  // Batch fetch order items in 1 query for ultra-fast response
  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    const [allItems] = await pool.query(`
      SELECT oi.*, p.name as product_name, p.category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (?)
    `, [orderIds]);

    const itemsByOrderId = {};
    for (const item of allItems) {
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push(item);
    }

    for (let order of orders) {
      order.items = itemsByOrderId[order.id] || [];
    }
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
           cc.remaining_amount as credit_remaining,
           (
             SELECT GROUP_CONCAT(DISTINCT 
               CASE 
                 WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'TAP'
                 WHEN p.method IN ('mastercard', 'master_card', 'master') THEN 'card'
                 ELSE p.method
               END
             )
             FROM payments p 
             WHERE p.order_id = o.id AND p.status = 'completed'
           ) as payment_methods
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

  // If order items list is empty (e.g. website service bookings), try to populate from services
  if (items.length === 0) {
    const [services] = await pool.query(
      'SELECT id, service_name, price FROM services WHERE order_id = ?',
      [id]
    );
    if (services.length > 0) {
      order.items = services.map(s => ({
        id: `svc_${s.id}`,
        product_id: null,
        product_name: order.payment_status === 'free' ? `${s.service_name} (Free Wash)` : s.service_name,
        quantity: 1,
        price: order.payment_status === 'free' ? 0.00 : s.price,
        category: 'Services',
        unit_price: order.payment_status === 'free' ? 0.00 : s.price
      }));
    }
  }

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

    let finalTotal = parseFloat(total);
    let finalDiscount = parseFloat(discount || 0);
    let freeWashRedeemed = false;
    let freeWashDiscount = 0;
    
    if (customer_id) {
      try {
        const { getWashStamps } = require('../utils/loyaltyStamps');
        const currentStamps = await getWashStamps(connection, customer_id);
        
        if (currentStamps >= 5) {
          const { calculateFreeWashCap } = require('../utils/freeWashCap');
          const cap = await calculateFreeWashCap(connection, customer_id);
          
          const eligibleFreeServices = [
            'full body service',
            'full body wash',
            'ceramic wash',
            'double soap'
          ];
          
          for (let item of items) {
            const [prodRows] = await connection.query('SELECT name, category FROM products WHERE id = ?', [item.product_id]);
            if (prodRows.length > 0) {
              const prodName = prodRows[0].name.toLowerCase().trim();
              const isEligible = eligibleFreeServices.some(s => prodName.includes(s)) && !prodName.includes('vip');
              const itemPrice = parseFloat(item.price);
              
              if (isEligible && itemPrice <= cap) {
                freeWashRedeemed = true;
                freeWashDiscount = itemPrice * parseFloat(item.quantity || 1);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking free wash during POS checkout:', err);
      }
    }
    
    if (freeWashRedeemed) {
      finalDiscount += freeWashDiscount;
      finalTotal = Math.max(0, finalTotal - freeWashDiscount);
    }

    let hasVip = false;
    let vipServiceName = '';
    
    for (let item of items) {
      const [prodRows] = await connection.query('SELECT name, category FROM products WHERE id = ?', [item.product_id]);
      if (prodRows.length > 0) {
        const prod = prodRows[0];
        if (prod.category === 'VIP' || prod.name.toLowerCase().includes('vip')) {
          hasVip = true;
          vipServiceName = prod.name;
          break;
        }
      }
    }
    
    let vipBookingId = null;
    if (hasVip && customer_id) {
      try {
        const [custRows] = await connection.query('SELECT name, phone, vehicle_plate, vehicle_type FROM customers WHERE id = ?', [customer_id]);
        if (custRows.length > 0) {
          const cust = custRows[0];
          const [existingVip] = await connection.query('SELECT id FROM vip_customers WHERE phone = ?', [cust.phone]);
          let vipCustomerId;
          if (existingVip.length > 0) {
            vipCustomerId = existingVip[0].id;
          } else {
            const [insertVip] = await connection.query(
              'INSERT INTO vip_customers (name, phone, vehicle_model, vehicle_type) VALUES (?, ?, ?, ?)',
              [cust.name, cust.phone, cust.vehicle_plate || 'N/A', cust.vehicle_type || 'Saloon']
            );
            vipCustomerId = insertVip.insertId;
          }
          
          const localToday = new Date();
          const yyyy = localToday.getFullYear();
          const mm = String(localToday.getMonth() + 1).padStart(2, '0');
          const dd = String(localToday.getDate()).padStart(2, '0');
          const todayDate = `${yyyy}-${mm}-${dd}`;
          
          const [bookingResult] = await connection.query(
            'INSERT INTO vip_bookings (vip_customer_id, service_type, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [vipCustomerId, vipServiceName, todayDate, '09:00', 'pending', 'Created via POS Sells screen']
          );
          vipBookingId = bookingResult.insertId;
        }
      } catch (err) {
        console.error('Error creating VIP booking from POS checkout:', err);
      }
    }

    const orderStatus = hasService ? 'processing' : 'completed';
    const serviceStartedAt = hasService ? new Date() : null;
    const serviceCompletedAt = hasService ? null : new Date();
    
    const paymentStatus = (finalTotal === 0) ? 'free' : 'pending';

    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_id, total, discount, status, payment_status, service_started_at, service_completed_at, vip_booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [customer_id || null, finalTotal, finalDiscount, orderStatus, paymentStatus, serviceStartedAt, serviceCompletedAt, vipBookingId]
    );

    const orderId = orderResult.insertId;

    if (freeWashRedeemed) {
      const { resetWashStamps } = require('../utils/loyaltyStamps');
      await resetWashStamps(connection, customer_id);
    }

    if (finalTotal === 0) {
      await connection.query(
        'INSERT INTO payments (order_id, amount, method, status) VALUES (?, 0.00, "free", "completed")',
        [orderId]
      );
    }

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
    } else if (status === 'cancelled') {
      statusUpdateQuery = 'UPDATE orders SET status = ?, payment_status = "cancelled" WHERE id = ?';
    }

    await connection.query(statusUpdateQuery, statusUpdateParams);

    // 2. Fetch order details to see if payment needs to be completed
    const [orders] = await connection.query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             c.vehicle_plate, c.vehicle_type, c.id as customer_id_ref,
             c.province as emirate
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
      await connection.query(
        'UPDATE payments SET status = "failed" WHERE order_id = ?',
        [id]
      );
      await connection.query(
        'DELETE FROM customer_credits WHERE order_id = ?',
        [id]
      );
    } else if (status === 'pending') {
      serviceStatus = 'pending';
      serviceStartedUpdate = ', started_at = NULL';
      serviceCompletedUpdate = ', completed_at = NULL';
    }

    if (status === 'completed' && order.customer_id_ref) {
      const isExemptEmirate = order.emirate === 'Garage' || order.emirate === 'Sniper car care';
      if (!isExemptEmirate) {
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
    }

    await connection.query(
      `UPDATE services SET status = ?${serviceStartedUpdate}${serviceCompletedUpdate} WHERE order_id = ?`,
      [serviceStatus, id]
    );

    if (status === 'cancelled') {
      await connection.query(
        'UPDATE orders SET payment_status = "cancelled" WHERE id = ?',
        [id]
      );
      if (order.vip_booking_id) {
        await connection.query(
          'UPDATE vip_bookings SET status = "cancelled" WHERE id = ?',
          [order.vip_booking_id]
        );
      }
    }

    // Handle Loyalty Stamps for Completed Orders
    const targetCustomerId = order.customer_id || order.customer_id_ref;
      if (targetCustomerId && parseFloat(order.total) > 0) {
        const [servicesList] = await connection.query(
          'SELECT service_name FROM services WHERE order_id = ?',
          [id]
        );
        const [itemsList] = await connection.query(
          'SELECT p.name, p.category FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
          [id]
        );

        const eligibleFreeServices = [
          'full body service',
          'full body wash',
          'ceramic wash',
          'double soap'
        ];

        let hasEligibleService = false;

        // Check services names
        for (let s of servicesList) {
          const sName = s.service_name.toLowerCase().trim();
          if (eligibleFreeServices.some(e => sName.includes(e)) || sName.includes('vip')) {
            hasEligibleService = true;
            break;
          }
        }

        // Check items names
        if (!hasEligibleService) {
          for (let item of itemsList) {
            const pName = item.name.toLowerCase().trim();
            if (eligibleFreeServices.some(e => pName.includes(e)) || item.category === 'VIP' || pName.includes('vip')) {
              hasEligibleService = true;
              break;
            }
          }
        }

        if (hasEligibleService) {
          const isExemptEmirate = order.emirate === 'Garage' || order.emirate === 'Sniper car care';
          if (!isExemptEmirate) {
            const { ensureLoyaltyRow, incrementWashStamp } = require('../utils/loyaltyStamps');
            await ensureLoyaltyRow(connection, targetCustomerId);
            await incrementWashStamp(connection, targetCustomerId);
          }
        }
      }
    }

    await connection.commit();
    connection.release();

    // Send SMS notification with Checkout link when service is completed (Done button pressed)
    if (status === 'completed') {
      const rawPhone = order.customer_phone;
      const formattedPhone = formatPhoneNumber(rawPhone);

      if (formattedPhone) {
        const checkoutUrl = buildPaymentUrl({
          vehicleType: order.vehicle_type || 'Saloon',
          plate: order.vehicle_plate,
          orderId: order.id
        });

        const checkoutMessage = `شكراً لزيارتك لـ Sniper Car Care!\nتم إكمال الخدمة لسيارتك 🚗\nالرجاء إختيار طريقة الدفع وإستكمال العملية عبر الرابط:\n${checkoutUrl}`;

        try {
          await sendReson8Message({
            to: formattedPhone,
            message: checkoutMessage,
            campaignName: 'ORDER_COMPLETED_CHECKOUT_LINK',
          });
          console.log(`[SMS] Checkout link SMS sent to ${formattedPhone} for order ${id}`);
        } catch (err) {
          console.error('[SMS] Checkout link SMS failed:', err.message);
        }
      } else {
        console.warn(`[SMS] Skipping checkout SMS for order ${id} – no valid phone number.`);
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

    // Delete customer credits
    await connection.query('DELETE FROM customer_credits WHERE order_id = ?', [id]);

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

// @desc    Generate Invoice PDF for an order
// @route   GET /api/orders/:id/pdf
// @access  Private
const getOrderInvoicePDF = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch order details
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

  // Fallback to services if order items list is empty
  if (items.length === 0) {
    const [services] = await pool.query(
      'SELECT id, service_name, price FROM services WHERE order_id = ?',
      [id]
    );
    if (services.length > 0) {
      order.items = services.map(s => ({
        id: `svc_${s.id}`,
        product_id: null,
        product_name: order.payment_status === 'free' ? `${s.service_name} (Free Wash)` : s.service_name,
        quantity: 1,
        price: order.payment_status === 'free' ? 0.00 : s.price,
        category: 'Services',
        unit_price: order.payment_status === 'free' ? 0.00 : s.price
      }));
    }
  }

  // Setup output folder
  const fs = require('fs');
  const path = require('path');
  const invoicesDir = path.join(__dirname, '..', 'uploads', 'invoices');
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const filename = `invoice-${id}-${Date.now()}.pdf`;
  const outputPath = path.join(invoicesDir, filename);

  // Generate PDF
  const { generateInvoicePDF } = require('../utils/pdfReportGenerator');
  await generateInvoicePDF(order, outputPath);

  // Return URL
  res.json({
    success: true,
    pdfUrl: `/uploads/invoices/${filename}`
  });
});

// @desc    Send Tap Payment link via Reson8 SMS/WhatsApp
// @route   POST /api/orders/:id/send-tap-link
// @access  Private
const sendTapPaymentLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tapService = require('../services/tapService');

  const [orders] = await pool.query(`
    SELECT o.*, 
           COALESCE(c.name, vc.name) as customer_name,
           COALESCE(c.phone, vc.phone) as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
    LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    WHERE o.id = ?
  `, [id]);

  if (orders.length === 0) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const order = orders[0];
  const phone = order.customer_phone;
  if (!phone) {
    return res.status(400).json({ message: 'No phone number linked to this customer.' });
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirect_url = `${protocol}://${host}/orders?status=success&order_id=${id}`;

  const charge = await tapService.createCharge({
    amount: parseFloat(order.total),
    currency: 'AED',
    customer_name: order.customer_name || 'Valued Customer',
    customer_phone: phone,
    order_id: id,
    redirect_url: redirect_url
  });

  const tapUrl = charge?.transaction?.url;
  if (!tapUrl) {
    return res.status(400).json({ message: 'Failed to generate Tap Payment link' });
  }

  const formattedPhone = formatPhoneNumber(phone);
  const message = `Hello ${order.customer_name || 'Valued Customer'}! Please use the link below to pay AED ${parseFloat(order.total).toFixed(2)} for your Sniper Car Care Order #${id}: ${tapUrl}`;

  await sendReson8Message({
    to: formattedPhone,
    message: message,
    campaignName: `Tap_Payment_Link_${id}`
  });

  res.json({
    success: true,
    message: `Tap Payment link sent to ${formattedPhone} via Reson8 successfully!`,
    payment_url: tapUrl
  });
});

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderInvoicePDF,
  sendTapPaymentLink
};

