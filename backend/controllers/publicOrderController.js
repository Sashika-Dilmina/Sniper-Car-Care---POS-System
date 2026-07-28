const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl } = require('../utils/customerLinkUtils');
const { ensureLoyaltyRow, incrementWashStamp, resetWashStamps, getWashStamps } = require('../utils/loyaltyStamps');

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
    // Determine vehicle type from body, notes (if it mentions 4x4) or default to Saloon
    let vehicleType = req.body.vehicle_type || 'Saloon';
    if (!req.body.vehicle_type && notes && (notes.toLowerCase().includes('4x4') || notes.toLowerCase().includes('(4x4)'))) {
      vehicleType = '4x4';
    }

    // If customer already exists, use their vehicle type
    if (finalCustomerId) {
      const [existingCustomer] = await connection.query(
        'SELECT vehicle_type FROM customers WHERE id = ?',
        [finalCustomerId]
      );
      if (existingCustomer.length > 0 && existingCustomer[0].vehicle_type) {
        const val = existingCustomer[0].vehicle_type.toString().trim();
        if (val === 'Saloon' || val === '4x4') {
          vehicleType = val;
        } else if (val.toLowerCase().includes('4x4') || val.toLowerCase().includes('4-wheel') || val.toLowerCase().includes('4wheel')) {
          vehicleType = '4x4';
        }
      }
    }

    // Extract emirate from vehicle_plate if possible and store it in province column
    let province = null;
    if (vehicle_plate) {
      const parts = vehicle_plate.split(' ');
      if (parts.length > 2) {
        province = parts.slice(1, parts.length - 1).join(' ');
      }
    }

    if (!finalCustomerId && customer_name && customer_phone && vehicle_plate) {
      // Check if customer with same plate exists
      const [existing] = await connection.query(
        'SELECT id FROM customers WHERE vehicle_plate = ?',
        [vehicle_plate]
      );
      
      if (existing.length > 0) {
        finalCustomerId = existing[0].id;
      } else {
        try {
          const [newCustomer] = await connection.query(
            'INSERT INTO customers (name, phone, vehicle_plate, vehicle_type, province) VALUES (?, ?, ?, ?, ?)',
            [customer_name, customer_phone, vehicle_plate, vehicleType, province]
          );
          finalCustomerId = newCustomer.insertId;
          try {
            await ensureLoyaltyRow(connection, finalCustomerId);
          } catch (loyaltyInitErr) {
            if (loyaltyInitErr.code !== 'ER_BAD_FIELD_ERROR') {
              throw loyaltyInitErr;
            }
          }
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
    }

    // Update customer info if they already exist but name, phone or province changed during checkout
    if (finalCustomerId && (customer_name || customer_phone || province)) {
      const [existing] = await connection.query(
        'SELECT name, phone, province FROM customers WHERE id = ?',
        [finalCustomerId]
      );
      if (existing.length > 0) {
        const updateFields = [];
        const updateParams = [];
        if (customer_name && existing[0].name !== customer_name) {
          updateFields.push('name = ?');
          updateParams.push(customer_name);
        }
        if (customer_phone && existing[0].phone !== customer_phone) {
          updateFields.push('phone = ?');
          updateParams.push(customer_phone);
        }
        if (province && existing[0].province !== province) {
          updateFields.push('province = ?');
          updateParams.push(province);
        }
        if (updateFields.length > 0) {
          updateParams.push(finalCustomerId);
          await connection.query(
            `UPDATE customers SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
          );
        }
      }
    }

    // Create order with notes - include customer info in notes if no customer_id
    let orderNotes = notes || '';
    if (!finalCustomerId && customer_name) {
      const customerInfo = `Customer: ${customer_name}${customer_phone ? ` (${customer_phone})` : ''}${vehicle_plate ? ` - Vehicle: ${vehicle_plate}` : ''}`;
      orderNotes = orderNotes ? `${customerInfo}\n${orderNotes}` : customerInfo;
    }

    // Deduplication check: prevent creating duplicate order within 10 seconds
    const [recentOrders] = await connection.query(`
      SELECT id FROM orders 
      WHERE ((customer_id IS NOT NULL AND customer_id = ?) OR (notes IS NOT NULL AND notes LIKE ?))
        AND total = ? 
        AND created_at >= TIMESTAMPADD(SECOND, -10, CURRENT_TIMESTAMP)
      ORDER BY id DESC LIMIT 1
    `, [finalCustomerId || 0, `%${vehicle_plate || 'NOMATCH'}%`, total]);

    if (recentOrders.length > 0) {
      const [existing] = await connection.query('SELECT * FROM orders WHERE id = ?', [recentOrders[0].id]);
      await connection.commit();
      connection.release();
      return res.status(200).json({
        message: 'Order created successfully',
        order: existing[0],
        deduplicated: true
      });
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

        // Check if item is a service, and create service task
        const [prodRows] = await connection.query('SELECT category, name FROM products WHERE id = ?', [item.product_id]);
        if (prodRows.length > 0 && prodRows[0].category === 'Services') {
          await connection.query(
            'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, order_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [finalCustomerId || null, prodRows[0].name, vehicleType, item.price, 'Added via Order Items', status || 'pending', orderId]
          );
        }
      }
    }

    let loyalty = null;

    const isWebsiteServiceBooking =
      finalCustomerId &&
      (!items || items.length === 0) &&
      (source === 'customer_website_saloon' ||
        source === 'customer_website_4x4' ||
        (source || '').includes('customer_website'));

    if (isWebsiteServiceBooking) {
      try {
        await ensureLoyaltyRow(connection, finalCustomerId);
        const currentStamps = await getWashStamps(connection, finalCustomerId);

        let serviceName = 'Car Care Service';
        if (notes && notes.includes('One-Tap Booking via Website - ')) {
          serviceName = notes.replace('One-Tap Booking via Website - ', '');
        } else if (notes) {
          serviceName = notes;
        }

        /*
        // Free wash rewards logic temporarily commented out
        if (currentStamps >= 5) {
          const { calculateFreeWashCap } = require('../utils/freeWashCap');
          const cap = await calculateFreeWashCap(connection, finalCustomerId);
          
          const sNameLower = serviceName.toLowerCase().trim();
          const eligibleFreeServices = [
            'full body service',
            'full body wash',
            'ceramic wash',
            'double soap'
          ];
          const isEligibleFree = eligibleFreeServices.some(s => sNameLower.includes(s)) && !sNameLower.includes('vip');
          const originalPrice = parseFloat(total);

          if (isEligibleFree && originalPrice <= cap) {
            // 6th wash -> Free Wash!
            loyalty = await resetWashStamps(connection, finalCustomerId);
            await connection.query(
              'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, order_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [finalCustomerId, serviceName, vehicleType, originalPrice, notes, status || 'pending', orderId]
            );

            await connection.query(
              'UPDATE orders SET total = 0.00, discount = ?, payment_status = ? WHERE id = ?',
              [total, 'free', orderId]
            );

            await connection.query(
              'INSERT INTO payments (order_id, amount, method, status) VALUES (?, 0.00, "free", "completed")',
              [orderId]
            );
          } else {
            // Price exceeds cap, or service is not eligible -> Charge normally!
            // Do NOT increment stamps, do NOT touch stamps (remain >= 5)
            await connection.query(
              'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, order_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [finalCustomerId, serviceName, vehicleType, total, notes, status || 'pending', orderId]
            );
          }
        } else {
        */
          // Paid booking, do not increment stamps yet!
          await connection.query(
            'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, order_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [finalCustomerId, serviceName, vehicleType, total, notes, status || 'pending', orderId]
          );
        // }
      } catch (loyaltyErr) {
        if (loyaltyErr.code !== 'ER_BAD_FIELD_ERROR') {
          throw loyaltyErr;
        }
      }
    }

    await connection.commit();

    const [newOrder] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    connection.release();

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder[0],
      loyalty: loyalty
        ? {
            wash_stamps: loyalty.wash_stamps,
            free_wash_ready: loyalty.wash_stamps >= 5,
            free_wash_earned: loyalty.free_wash_earned,
          }
        : null,
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
           COALESCE(c.name, vc.name) as customer_name,
           COALESCE(c.phone, vc.phone) as customer_phone,
           COALESCE(c.vehicle_plate, vc.vehicle_model) as vehicle_plate,
           COALESCE(c.vehicle_type, vc.vehicle_type) as vehicle_type
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
  const [items] = await pool.query(
    'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
    [id]
  );

  let mappedItems = items;
  if (items.length === 0) {
    const [services] = await pool.query(
      'SELECT id, service_name, price FROM services WHERE order_id = ?',
      [id]
    );
    if (services.length > 0) {
      mappedItems = services.map(s => ({
        id: `svc_${s.id}`,
        product_name: order.payment_status === 'free' ? `${s.service_name} (Free Wash)` : s.service_name,
        quantity: 1,
        price: order.payment_status === 'free' ? 0.00 : s.price,
        category: 'Services',
        unit_price: order.payment_status === 'free' ? 0.00 : s.price
      }));
    }
  }

  res.json({
    order: {
      ...order,
      items: mappedItems
    }
  });
});

// @desc    Confirm order (mark as processing)
// @route   POST /api/public/orders/confirm
// @access  Public
const confirmOrder = asyncHandler(async (req, res) => {
  const { order_id, payment_method } = req.body;

  if (!order_id) {
    return res.status(400).json({ message: 'Order ID is required' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const isPendingPayment = payment_method === 'cash' || payment_method === 'card';
    const paymentStatus = isPendingPayment ? 'pending' : 'paid';

    // Fetch existing order status
    const [existingOrders] = await connection.query('SELECT status, service_completed_at FROM orders WHERE id = ?', [order_id]);
    const isAlreadyCompleted = existingOrders.length > 0 && existingOrders[0].status === 'completed';

    // Check if order contains only products
    const [items] = await connection.query(
      'SELECT oi.*, p.category FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [order_id]
    );
    const hasService = items.length === 0 || items.some(item => item.category === 'Services');
    const targetStatus = isAlreadyCompleted ? 'completed' : (hasService ? 'processing' : 'completed');
    const serviceCompletedAt = targetStatus === 'completed' ? (existingOrders[0]?.service_completed_at || new Date()) : null;

    // Update order status and set service_started_at / service_completed_at
    await connection.query(
      'UPDATE orders SET status = ?, payment_status = ?, service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP), service_completed_at = COALESCE(?, service_completed_at) WHERE id = ?',
      [targetStatus, paymentStatus, serviceCompletedAt, order_id]
    );

    // Also update associated services to 'in_progress' if the order has service items and is not already completed
    if (hasService && !isAlreadyCompleted) {
      await connection.query(
        'UPDATE services SET status = "in_progress", started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE order_id = ?',
        [order_id]
      );
    }

    // Fetch order total to create/update payments row
    const [orders] = await connection.query('SELECT total FROM orders WHERE id = ?', [order_id]);
    if (orders.length > 0) {
      const total = orders[0].total;

      // Check if there is already a payment record for this order
      const [existing] = await connection.query('SELECT id FROM payments WHERE order_id = ?', [order_id]);
      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
          [order_id, total, payment_method || 'cash', isPendingPayment ? 'pending' : 'completed']
        );
      } else {
        await connection.query(
          'UPDATE payments SET method = ?, status = ?, amount = ? WHERE order_id = ?',
          [payment_method || 'cash', isPendingPayment ? 'pending' : 'completed', total, order_id]
        );
      }
    }

    await connection.commit();
    connection.release();

    res.json({ message: 'Order confirmed successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
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

        // Fetch existing order status
        const [existingOrders] = await connection.query('SELECT status, service_completed_at FROM orders WHERE id = ?', [order_id]);
        const isAlreadyCompleted = existingOrders.length > 0 && existingOrders[0].status === 'completed';

        // Check if order contains only products
        const [items] = await connection.query(
          'SELECT oi.*, p.category FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
          [order_id]
        );
        const hasService = items.length === 0 || items.some(item => item.category === 'Services');
        const targetStatus = isAlreadyCompleted ? 'completed' : (hasService ? 'processing' : 'completed');
        const serviceCompletedAt = targetStatus === 'completed' ? (existingOrders[0]?.service_completed_at || new Date()) : null;

        // Update order payment status and set status
        await connection.query(
          'UPDATE orders SET payment_status = ?, status = ?, service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP), service_completed_at = COALESCE(?, service_completed_at) WHERE id = ?',
          ['paid', targetStatus, serviceCompletedAt, order_id]
        );

        // Also update associated services to 'in_progress' if the order has service items and is not already completed
        if (hasService && !isAlreadyCompleted) {
          await connection.query(
            'UPDATE services SET status = "in_progress", started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE order_id = ?',
            [order_id]
          );
        }

        // Fetch order details for VIP sync
        const [orderRows] = await connection.query('SELECT vip_booking_id FROM orders WHERE id = ?', [order_id]);
        if (orderRows.length > 0) {
          const order = orderRows[0];
          // If it is a VIP booking order, update VIP booking status to 'confirmed'
          if (order.vip_booking_id) {
            await connection.query(
              'UPDATE vip_bookings SET status = "confirmed" WHERE id = ?',
              [order.vip_booking_id]
            );
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
        if (error.code === 'ER_DUP_ENTRY') {
          return res.json({
            message: 'Payment confirmed successfully'
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

// @desc    Update order note from customer website Thank You page
// @route   PATCH /api/public/orders/:id/note or PUT /api/public/orders/:id/note
// @access  Public
const updateOrderNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, note } = req.body;
  const noteText = (notes !== undefined ? notes : note) || '';

  const [orders] = await pool.query('SELECT id, notes FROM orders WHERE id = ?', [id]);
  if (orders.length === 0) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const existingNote = orders[0].notes || '';
  let updatedNote = noteText.trim();

  // If order already has initial notes, format nicely or replace empty note
  if (existingNote && updatedNote) {
    if (!existingNote.includes(updatedNote)) {
      updatedNote = `${existingNote}\nCustomer Note: ${updatedNote}`;
    } else {
      updatedNote = existingNote;
    }
  } else if (!updatedNote) {
    updatedNote = existingNote;
  }

  await pool.query('UPDATE orders SET notes = ? WHERE id = ?', [updatedNote, id]);

  res.json({
    success: true,
    message: 'Note updated successfully',
    notes: updatedNote
  });
});

module.exports = {
  createOrder,
  getOrder,
  confirmOrder,
  createPaymentIntent,
  confirmPayment,
  updateOrderNote
};


