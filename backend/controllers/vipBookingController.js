const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { formatPhoneNumber, buildFeedbackUrl } = require('../utils/customerLinkUtils');

// Helper function to send VIP completion notification
async function sendVIPCompletionNotification(booking, customer, orderId) {
  if (!customer) {
    console.warn('[Reson8] Skipping completion SMS - no customer linked to VIP booking.');
    return;
  }

  const formattedPhone = formatPhoneNumber(customer.phone);
  if (!formattedPhone) {
    console.warn(`[Reson8] Skipping completion SMS - invalid phone for VIP customer ${customer.id}.`);
    return;
  }

  // Look up main customer ID by phone to check stamps
  let stampsMsg = "";
  try {
    const [mainCustomer] = await db.query(
      'SELECT id FROM customers WHERE phone = ?',
      [customer.phone]
    );
    if (mainCustomer.length > 0) {
      const { getWashStamps } = require('../utils/loyaltyStamps');
      const currentStamps = await getWashStamps(db, mainCustomer[0].id);
      
      const [orderRows] = await db.query('SELECT payment_status FROM orders WHERE id = ?', [orderId]);
      const orderPayStatus = orderRows.length > 0 ? orderRows[0].payment_status : 'pending';

      if (currentStamps === 0) {
        if (orderPayStatus === 'free') {
          stampsMsg = " Congrats! You earned a FREE wash for your next visit!";
        } else {
          stampsMsg = " You have completed 5/5 washes. Congrats! You earned a FREE wash for your next visit!";
        }
      } else {
        stampsMsg = ` You have completed ${currentStamps}/5 washes. Only ${5 - currentStamps} more washes left to get your FREE wash!`;
      }
    }
  } catch (err) {
    console.error('Error fetching stamps for VIP SMS:', err);
  }

  const feedbackUrl = buildFeedbackUrl({
    vehicleType: customer.vehicle_type || 'Saloon',
    customerId: null,
    plate: customer.vehicle_model,
    orderId: orderId,
  });

  const firstName = customer.name ? customer.name.split(' ')[0] : 'Customer';
  let message = `Hi ${firstName}, your VIP ${booking.service_type} service is complete. Thank you for choosing Sniper Car Care.`;

  if (feedbackUrl) {
    message += ` Share feedback: ${feedbackUrl}`;
  }
  
  message += stampsMsg;

  await sendReson8Message({
    to: formattedPhone,
    message,
    campaignName: 'VIP_SERVICE_COMPLETION',
    metadata: {
      bookingId: booking.id,
      vipCustomerId: customer.id,
      orderId: orderId
    },
  });
}


// @desc Get all VIP bookings
// @route GET /api/vip-bookings
// @access Private
exports.getVIPBookings = asyncHandler(async (req, res) => {
  let query = `
    SELECT 
      vb.*,
      vc.name,
      vc.phone,
      vc.vehicle_model,
      u.name as staff_name,
      o.id as order_id,
      o.payment_status as order_payment_status,
      o.total as order_total,
      o.service_started_at,
      o.service_completed_at,
      (SELECT method FROM payments WHERE order_id = o.id ORDER BY id DESC LIMIT 1) as payment_method
    FROM vip_bookings vb
    JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN users u ON vb.assigned_staff_id = u.id
    LEFT JOIN orders o ON o.vip_booking_id = vb.id
  `;
  const params = [];
  query += ' ORDER BY vb.id DESC';

  const [bookings] = await db.query(query, params);
  
  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// @desc Get VIP booking by ID
// @route GET /api/vip-bookings/:id
// @access Private
exports.getVIPBookingById = asyncHandler(async (req, res) => {
  const [booking] = await db.query(`
    SELECT 
      vb.*,
      vc.name,
      vc.phone,
      vc.email,
      vc.vehicle_model,
      vc.vehicle_type,
      u.name as staff_name,
      vs.name as service_name,
      vs.description as service_description,
      o.id as order_id,
      o.payment_status as order_payment_status,
      o.total as order_total,
      o.service_started_at,
      o.service_completed_at,
      (SELECT method FROM payments WHERE order_id = o.id ORDER BY id DESC LIMIT 1) as payment_method
    FROM vip_bookings vb
    JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN users u ON vb.assigned_staff_id = u.id
    LEFT JOIN vip_services vs ON vb.service_type = vs.name
    LEFT JOIN orders o ON o.vip_booking_id = vb.id
    WHERE vb.id = ?
  `, [req.params.id]);
  
  if (booking.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'VIP booking not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: booking[0]
  });
});

// @desc Create VIP customer and booking
// @route POST /api/vip-bookings
// @access Public
exports.createVIPBooking = asyncHandler(async (req, res) => {
  const { name, phone, email, vehicle_model, vehicle_type, service_type, appointment_date, appointment_time, notes } = req.body;
  
  // Validate required fields (appointment_date and appointment_time are now optional for registration)
  if (!name || !phone || !vehicle_model || !vehicle_type || !service_type) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }
  
  try {
    // Check if VIP customer already exists by phone
    const [existingCustomer] = await db.query(
      'SELECT id FROM vip_customers WHERE phone = ?',
      [phone]
    );
    
    let vipCustomerId;
    
    if (existingCustomer.length > 0) {
      vipCustomerId = existingCustomer[0].id;
      // Update existing customer
      await db.query(
        'UPDATE vip_customers SET name = ?, email = ?, vehicle_model = ?, vehicle_type = ? WHERE id = ?',
        [name, email, vehicle_model, vehicle_type, vipCustomerId]
      );
    } else {
      // Create new VIP customer
      const [result] = await db.query(
        'INSERT INTO vip_customers (name, phone, email, vehicle_model, vehicle_type) VALUES (?, ?, ?, ?, ?)',
        [name, phone, email, vehicle_model, vehicle_type]
      );
      vipCustomerId = result.insertId;
    }
    
    // Create booking
    const [bookingResult] = await db.query(
      'INSERT INTO vip_bookings (vip_customer_id, service_type, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [vipCustomerId, service_type, appointment_date || null, appointment_time || null, 'pending', notes || null]
    );

    // Fetch price for VIP service from vip_services by service_type name
    const [serviceRows] = await db.query('SELECT price FROM vip_services WHERE name = ?', [service_type]);
    let price = serviceRows.length > 0 ? parseFloat(serviceRows[0].price) : 0;

    // Fallback if price is 0 (ensure VIP pricing is always correct)
    if (price === 0) {
      if (service_type === 'Saloon VIP Service') {
        price = 95.00;
      } else if (service_type === '4x4 VIP Service') {
        price = 115.00;
      }
    }

    // Check if customer exists in the main customers table by phone
    const { formatPhoneNumber } = require('../utils/customerLinkUtils');
    const formattedPhone = formatPhoneNumber(req.body.phone || phone);
    const [mainCustomer] = await db.query(
      'SELECT id FROM customers WHERE phone = ? OR phone = ?',
      [formattedPhone, phone]
    );
    const mainCustomerId = mainCustomer.length > 0 ? mainCustomer[0].id : null;

    // Create corresponding order in the orders table
    const [orderResult] = await db.query(
      'INSERT INTO orders (customer_id, total, discount, status, payment_status, source, vip_booking_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [mainCustomerId, price, 0, 'pending', 'pending', 'vip_booking', bookingResult.insertId, notes || `VIP Booking - ${service_type}`]
    );
    
    res.status(201).json({
      success: true,
      message: 'VIP booking created successfully',
      bookingId: bookingResult.insertId,
      orderId: orderResult.insertId,
      customerId: vipCustomerId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating VIP booking',
      error: error.message
    });
  }
});

// @desc Update VIP booking status
// @route PATCH /api/vip-bookings/:id
// @access Private
exports.updateVIPBooking = asyncHandler(async (req, res) => {
  const { status, assigned_staff_id, notes, staff_notes, appointment_date, appointment_time } = req.body;
  
  const [booking] = await db.query(
    'SELECT * FROM vip_bookings WHERE id = ?',
    [req.params.id]
  );
  
  if (booking.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'VIP booking not found'
    });
  }
  
  // Build update query
  let updateFields = [];
  let updateValues = [];
  
  if (status) {
    updateFields.push('status = ?');
    updateValues.push(status);
  }
  if (assigned_staff_id !== undefined) {
    // allow setting staff to null or value
    updateFields.push('assigned_staff_id = ?');
    updateValues.push(assigned_staff_id || null);
  }
  if (notes !== undefined) {
    updateFields.push('notes = ?');
    updateValues.push(notes);
  }
  if (staff_notes !== undefined) {
    updateFields.push('staff_notes = ?');
    updateValues.push(staff_notes);
  }
  if (appointment_date !== undefined) {
    updateFields.push('appointment_date = ?');
    updateValues.push(appointment_date || null);
  }
  if (appointment_time !== undefined) {
    updateFields.push('appointment_time = ?');
    updateValues.push(appointment_time || null);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }
  
  updateValues.push(req.params.id);
  
  await db.query(
    `UPDATE vip_bookings SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Sync to orders table
  if (status) {
    let orderStatus = 'pending';
    let additionalSets = '';
    // When booking is confirmed (scheduled), the order remains pending in orders table (so it has the Start Service button)
    if (status === 'confirmed') {
      orderStatus = 'pending';
    } else if (status === 'in_progress') {
      orderStatus = 'processing';
      additionalSets = ', service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP)';
    } else if (status === 'completed') {
      orderStatus = 'completed';
      additionalSets = ', service_completed_at = COALESCE(service_completed_at, CURRENT_TIMESTAMP), service_started_at = COALESCE(service_started_at, CURRENT_TIMESTAMP)';
      
      try {
        const [orderRows] = await db.query(
          `SELECT o.id, o.total, o.payment_status, o.customer_id, vc.phone as vip_phone 
           FROM orders o
           JOIN vip_bookings vb ON o.vip_booking_id = vb.id
           JOIN vip_customers vc ON vb.vip_customer_id = vc.id
           WHERE o.vip_booking_id = ?`,
          [req.params.id]
        );
        if (orderRows.length > 0) {
          const order = orderRows[0];
          if (order.payment_status !== 'paid' && order.payment_status !== 'free') {
            const payMethod = req.body.payment_method || 'cash';
            
            // Record payment in payments table
            await db.query(
              'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, "completed")',
              [order.id, order.total, payMethod]
            );
            
            additionalSets += `, payment_status = 'paid'`;
          }

          // Trigger Loyalty Points / Stamps increment for VIP completion
          let targetCustomerId = order.customer_id;
          if (!targetCustomerId && order.vip_phone) {
            const { formatPhoneNumber } = require('../utils/customerLinkUtils');
            const formattedPhone = formatPhoneNumber(order.vip_phone);
            const [mainCust] = await db.query(
              'SELECT id FROM customers WHERE phone = ? OR phone = ?',
              [formattedPhone, order.vip_phone]
            );
            if (mainCust.length > 0) {
              targetCustomerId = mainCust[0].id;
              // Link the customer to the order
              await db.query('UPDATE orders SET customer_id = ? WHERE id = ?', [targetCustomerId, order.id]);
            }
          }

          if (targetCustomerId && parseFloat(order.total) > 0) {
            const [custRows] = await db.query('SELECT province FROM customers WHERE id = ?', [targetCustomerId]);
            const isExemptEmirate = custRows.length > 0 && (custRows[0].province === 'Garage' || custRows[0].province === 'Sniper car care');
            if (!isExemptEmirate) {
              const { ensureLoyaltyRow, incrementWashStamp } = require('../utils/loyaltyStamps');
              await ensureLoyaltyRow(db, targetCustomerId);
              await incrementWashStamp(db, targetCustomerId);
            }
          }
        }
      } catch (err) {
        console.error('Error auto-recording payment or loyalty stamps for completed VIP booking:', err);
      }
    } else if (status === 'cancelled') {
      orderStatus = 'cancelled';
    }

    await db.query(
      `UPDATE orders SET status = ?${additionalSets} WHERE vip_booking_id = ?`,
      [orderStatus, req.params.id]
    );

    // If confirmed, send in-app notification to customer (no SMS)
    if (status === 'confirmed') {
      try {
        const [bookingRows] = await db.query('SELECT * FROM vip_bookings WHERE id = ?', [req.params.id]);
        if (bookingRows.length > 0) {
          const currentBooking = bookingRows[0];
          const [customerRows] = await db.query('SELECT * FROM vip_customers WHERE id = ?', [currentBooking.vip_customer_id]);
          if (customerRows.length > 0) {
            const customer = customerRows[0];
            const formattedDate = currentBooking.appointment_date 
              ? new Date(currentBooking.appointment_date).toLocaleDateString('en-GB') // e.g. DD/MM/YYYY
              : '';
            const formattedTime = currentBooking.appointment_time || '';
            const message = `Your VIP ${currentBooking.service_type} booking has been confirmed! Your appointment is scheduled for ${formattedDate} at ${formattedTime}. Thank you for choosing Sniper Car Care!`;
            
            await db.query(
              'INSERT INTO customer_notifications (vehicle_plate, title, message) VALUES (?, ?, ?)',
              [customer.vehicle_model, 'Appointment Confirmed 📅', message]
            );
            console.log(`[Notification] VIP Booking Confirmation saved for plate ${customer.vehicle_model}`);
          }
        }
      } catch (err) {
        console.error('Error creating VIP booking confirmation notification:', err.message);
      }
    }

    // If completed, send feedback SMS
    if (status === 'completed') {
      try {
        const [bookingRows] = await db.query('SELECT * FROM vip_bookings WHERE id = ?', [req.params.id]);
        if (bookingRows.length > 0) {
          const currentBooking = bookingRows[0];
          const [customerRows] = await db.query('SELECT * FROM vip_customers WHERE id = ?', [currentBooking.vip_customer_id]);
          const [orderRows] = await db.query('SELECT id FROM orders WHERE vip_booking_id = ?', [currentBooking.id]);
          
          if (customerRows.length > 0) {
            const customer = customerRows[0];
            const orderId = orderRows.length > 0 ? orderRows[0].id : null;
            await sendVIPCompletionNotification(currentBooking, customer, orderId);
            console.log(`[SMS] VIP Completion SMS sent to ${customer.phone}`);
          }
        }
      } catch (err) {
        console.error('Error sending VIP completion SMS:', err.message);
      }
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'VIP booking updated successfully'
  });
});

// @desc Get VIP bookings by date range
// @route GET /api/vip-bookings/schedule?start_date=:date&end_date=:date
// @access Private
exports.getVIPBookingsByDateRange = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'Please provide start_date and end_date'
    });
  }
  
  const [bookings] = await db.query(`
    SELECT 
      vb.*,
      vc.name,
      vc.phone,
      vc.vehicle_model,
      u.name as staff_name
    FROM vip_bookings vb
    JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN users u ON vb.assigned_staff_id = u.id
    WHERE vb.appointment_date BETWEEN ? AND ?
    ORDER BY vb.appointment_date ASC, vb.appointment_time ASC
  `, [start_date, end_date]);
  
  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// @desc Get available time slots for a date
// @route GET /api/vip-bookings/available-slots/:date
// @access Public
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { date } = req.params;
  
  // Define available time slots
  const allSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  
  const [bookedSlots] = await db.query(
    'SELECT appointment_time FROM vip_bookings WHERE appointment_date = ? AND status IN ("pending", "confirmed", "in_progress")',
    [date]
  );

  const normalizeTime = (value) => {
    if (!value) return '';
    const raw = typeof value === 'string' ? value : String(value);
    const match = raw.match(/(\d{1,2}):(\d{2})/);
    if (!match) return raw.slice(0, 5);
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  };

  const bookedSet = new Set(
    bookedSlots.map((slot) => normalizeTime(slot.appointment_time))
  );
  const availableSlots = allSlots.filter((slot) => !bookedSet.has(normalizeTime(slot)));
  
  res.status(200).json({
    success: true,
    available_slots: availableSlots
  });
});

// @desc Delete VIP booking
// @route DELETE /api/vip-bookings/:id
// @access Private
exports.deleteVIPBooking = asyncHandler(async (req, res) => {
  const [booking] = await db.query(
    'SELECT * FROM vip_bookings WHERE id = ?',
    [req.params.id]
  );
  
  if (booking.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'VIP booking not found'
    });
  }
  
  await db.query(
    'DELETE FROM vip_bookings WHERE id = ?',
    [req.params.id]
  );
  
  res.status(200).json({
    success: true,
    message: 'VIP booking deleted successfully'
  });
});

// @desc Get VIP services
// @route GET /api/vip-services
// @access Public
exports.getVIPServices = asyncHandler(async (req, res) => {
  const [services] = await db.query('SELECT * FROM vip_services ORDER BY price ASC');
  
  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc Get VIP customers for admin
// @route GET /api/vip-customers
// @access Private
exports.getVIPCustomers = asyncHandler(async (req, res) => {
  const [customers] = await db.query(`
    SELECT 
      MIN(vc.id) as id,
      vc.phone,
      MAX(vc.name) as name,
      MAX(vc.email) as email,
      MAX(vc.vehicle_model) as vehicle_model,
      MAX(vc.vehicle_type) as vehicle_type,
      COUNT(vb.id) as total_bookings,
      MAX(vb.appointment_date) as last_booking_date
    FROM vip_customers vc
    LEFT JOIN vip_bookings vb ON vc.id = vb.vip_customer_id
    GROUP BY vc.phone
    ORDER BY MAX(vc.created_at) DESC
  `);
  
  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers
  });
});

// @desc Get today's VIP appointments
// @route GET /api/vip-bookings/today
// @access Private
exports.getTodayVIPAppointments = asyncHandler(async (req, res) => {
  const localToday = new Date();
  const yyyy = localToday.getFullYear();
  const mm = String(localToday.getMonth() + 1).padStart(2, '0');
  const dd = String(localToday.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;
  
  const [appointments] = await db.query(`
    SELECT 
      vb.*,
      vc.name,
      vc.phone,
      vc.vehicle_model,
      vc.vehicle_type,
      u.name as staff_name,
      o.id as order_id,
      o.payment_status as order_payment_status,
      o.service_started_at,
      o.service_completed_at
    FROM vip_bookings vb
    JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN users u ON vb.assigned_staff_id = u.id
    LEFT JOIN orders o ON o.vip_booking_id = vb.id
    WHERE vb.appointment_date = ?
    ORDER BY vb.appointment_time ASC
  `, [today]);
  
  const [totalCount] = await db.query(
    'SELECT COUNT(*) as count FROM vip_bookings WHERE appointment_date >= ? AND status IN ("pending", "confirmed")',
    [today]
  );
  
  res.status(200).json({
    success: true,
    count: appointments.length,
    total_upcoming: totalCount[0].count,
    data: appointments
  });
});

// @desc Get VIP customer details
// @route GET /api/vip-customers/:id
// @access Private
exports.getVIPCustomerById = asyncHandler(async (req, res) => {
  const [customerRows] = await db.query(
    'SELECT * FROM vip_customers WHERE id = ?',
    [req.params.id]
  );
  
  if (customerRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'VIP customer not found'
    });
  }
  
  const customer = customerRows[0];
  
  // Get all VIP customer IDs matching this customer's phone number
  const [phoneCustomers] = await db.query(
    'SELECT id FROM vip_customers WHERE phone = ?',
    [customer.phone]
  );
  const customerIds = phoneCustomers.map(c => c.id);
  
  // Get bookings for all matching customer IDs
  const [bookings] = await db.query(`
    SELECT 
      vb.*,
      u.name as staff_name,
      o.id as order_id,
      o.payment_status as order_payment_status,
      o.total as order_total,
      o.service_started_at,
      o.service_completed_at
    FROM vip_bookings vb
    LEFT JOIN users u ON vb.assigned_staff_id = u.id
    LEFT JOIN orders o ON o.vip_booking_id = vb.id
    WHERE vb.vip_customer_id IN (?)
    ORDER BY vb.appointment_date DESC, vb.id DESC
  `, [customerIds]);
  
  res.status(200).json({
    success: true,
    data: {
      customer,
      bookings
    }
  });
});
