const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc Get all VIP bookings
// @route GET /api/vip-bookings
// @access Private
exports.getVIPBookings = asyncHandler(async (req, res) => {
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
    ORDER BY vb.appointment_date DESC, vb.appointment_time DESC
  `);
  
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
      vs.description as service_description
    FROM vip_bookings vb
    JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN users u ON vb.assigned_staff_id = u.id
    LEFT JOIN vip_services vs ON vb.service_type = vs.name
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
  const { name, phone, email, vehicle_model, vehicle_type, service_type, appointment_date, appointment_time } = req.body;
  
  // Validate required fields
  if (!name || !phone || !vehicle_model || !vehicle_type || !service_type || !appointment_date || !appointment_time) {
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
      'INSERT INTO vip_bookings (vip_customer_id, service_type, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?)',
      [vipCustomerId, service_type, appointment_date, appointment_time, 'pending']
    );
    
    res.status(201).json({
      success: true,
      message: 'VIP booking created successfully',
      bookingId: bookingResult.insertId,
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
  const { status, assigned_staff_id, notes } = req.body;
  
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
  if (assigned_staff_id) {
    updateFields.push('assigned_staff_id = ?');
    updateValues.push(assigned_staff_id);
  }
  if (notes) {
    updateFields.push('notes = ?');
    updateValues.push(notes);
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
      vc.*,
      COUNT(vb.id) as total_bookings,
      MAX(vb.appointment_date) as last_booking_date
    FROM vip_customers vc
    LEFT JOIN vip_bookings vb ON vc.id = vb.vip_customer_id
    GROUP BY vc.id
    ORDER BY vc.created_at DESC
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
  const today = new Date().toISOString().split('T')[0];
  
  const [appointments] = await db.query(`
    SELECT 
      vb.*,
      vc.name,
      vc.phone,
      vc.vehicle_model,
      vc.vehicle_type,
      u.name as staff_name
    FROM vip_bookings vb
    JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    LEFT JOIN users u ON vb.assigned_staff_id = u.id
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
  const [customer] = await db.query(
    'SELECT * FROM vip_customers WHERE id = ?',
    [req.params.id]
  );
  
  if (customer.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'VIP customer not found'
    });
  }
  
  const [bookings] = await db.query(
    'SELECT * FROM vip_bookings WHERE vip_customer_id = ? ORDER BY appointment_date DESC',
    [req.params.id]
  );
  
  res.status(200).json({
    success: true,
    data: {
      customer: customer[0],
      bookings
    }
  });
});
