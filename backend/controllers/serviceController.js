const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { buildFeedbackUrl, formatPhoneNumber } = require('../utils/customerLinkUtils');

// @desc    Get all services
// @route   GET /api/services
// @access  Private
const getServices = asyncHandler(async (req, res) => {
  const { vehicle_type, status } = req.query;
  let query = `
    SELECT s.*, 
           c.name as customer_name,
           c.phone as customer_phone,
           c.vehicle_plate,
           c.vehicle_type as customer_vehicle_type
    FROM services s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (vehicle_type) {
    query += ' AND s.vehicle_type = ?';
    params.push(vehicle_type);
  }

  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }

  query += ' ORDER BY s.created_at DESC';

  const [services] = await pool.query(query, params);

  res.json({ services });
});

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Private
const getService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [services] = await pool.query(`
    SELECT s.id, s.customer_id, s.service_name, s.price, s.description, s.status, s.created_at, s.updated_at,
           s.vehicle_type,
           c.name as customer_name,
           c.phone as customer_phone,
           c.vehicle_plate,
           c.vehicle_type as customer_vehicle_type
    FROM services s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `, [id]);

  if (services.length === 0) {
    return res.status(404).json({ message: 'Service not found' });
  }

  res.json({ service: services[0] });
});

const createService = asyncHandler(async (req, res) => {
  const { customer_id, service_name, vehicle_type, price, description, status } = req.body;

  if (!service_name || !vehicle_type || !price) {
    return res.status(400).json({ message: 'Service name, vehicle type, and price are required' });
  }

  const initialStatus = status || 'pending';
  let startedAt = null;
  let completedAt = null;
  if (initialStatus === 'in_progress') {
    startedAt = new Date();
  } else if (initialStatus === 'completed') {
    startedAt = new Date();
    completedAt = new Date();
  }

  const [result] = await pool.query(
    'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [customer_id || null, service_name, vehicle_type, price, description || null, initialStatus, startedAt, completedAt]
  );

  const [newService] = await pool.query('SELECT * FROM services WHERE id = ?', [result.insertId]);

  res.status(201).json({ message: 'Service created successfully', service: newService[0] });
});

// @desc    Update service status
// @route   PUT /api/services/:id/status
// @access  Private
const updateServiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  const [services] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);
  if (services.length === 0) {
    return res.status(404).json({ message: 'Service not found' });
  }

  const service = services[0];
  let customer = null;

  if (service.customer_id) {
    const [customerRows] = await pool.query(
      'SELECT id, name, phone, vehicle_plate, vehicle_type FROM customers WHERE id = ?',
      [service.customer_id]
    );
    if (customerRows.length > 0) {
      customer = customerRows[0];
    }
  }

  if (status === 'in_progress') {
    await pool.query(
      'UPDATE services SET status = ?, started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = ?',
      [status, id]
    );
  } else if (status === 'completed') {
    await pool.query(
      'UPDATE services SET status = ?, completed_at = CURRENT_TIMESTAMP, started_at = COALESCE(started_at, created_at, CURRENT_TIMESTAMP) WHERE id = ?',
      [status, id]
    );
  } else if (status === 'pending') {
    await pool.query(
      'UPDATE services SET status = ?, started_at = NULL, completed_at = NULL WHERE id = ?',
      [status, id]
    );
  } else {
    await pool.query('UPDATE services SET status = ? WHERE id = ?', [status, id]);
  }

  // If service completed, send notification and award loyalty points
  if (status === 'completed' && service.customer_id) {
    // Award loyalty points (25 points per service)
    const [loyalty] = await pool.query(
      'SELECT points FROM loyalty WHERE customer_id = ?',
      [service.customer_id]
    );

    let newPoints = 25;
    if (loyalty.length > 0) {
      await pool.query(
        'UPDATE loyalty SET points = points + 25 WHERE customer_id = ?',
        [service.customer_id]
      );
      newPoints = loyalty[0].points + 25;
    } else {
      await pool.query(
        'INSERT INTO loyalty (customer_id, points) VALUES (?, ?)',
        [service.customer_id, 25]
      );
    }

    // Check if customer reached 100 points (eligible for free service)
    if (newPoints >= 100) {
      console.log(`🎉 Customer ${service.customer_id} has reached ${newPoints} points and is eligible for a FREE service!`);
    }

    // Send notification (mock)
    try {
      await sendServiceCompletionNotification(service, customer, newPoints >= 100);
    } catch (error) {
      console.error('Notification sending failed:', error.message);
    }
  }

  const [updated] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);

  res.json({ message: 'Service status updated successfully', service: updated[0] });
});

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private
const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [services] = await pool.query('SELECT id FROM services WHERE id = ?', [id]);
  if (services.length === 0) {
    return res.status(404).json({ message: 'Service not found' });
  }

  await pool.query('DELETE FROM services WHERE id = ?', [id]);

  res.json({ message: 'Service deleted successfully' });
});

// @desc    Redeem free service (loyalty reward)
// @route   POST /api/services/redeem-free-service
// @access  Private
const redeemFreeService = asyncHandler(async (req, res) => {
  const { customer_id, service_name, vehicle_type, price, description } = req.body;

  if (!customer_id || !service_name || !vehicle_type) {
    return res.status(400).json({ message: 'Customer ID, service name, and vehicle type are required' });
  }

  // Check if customer has 100+ points
  const [loyalty] = await pool.query(
    'SELECT points FROM loyalty WHERE customer_id = ?',
    [customer_id]
  );

  if (loyalty.length === 0 || loyalty[0].points < 100) {
    return res.status(400).json({ 
      message: 'Customer does not have enough loyalty points. Need 100 points for a free service.',
      currentPoints: loyalty.length > 0 ? loyalty[0].points : 0
    });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Create the free service
    const [result] = await connection.query(
      'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [customer_id, service_name, vehicle_type, price || 0, (description || '') + ' [FREE SERVICE - Loyalty Reward]', 'completed']
    );

    // Reset loyalty points to 0
    await connection.query(
      'UPDATE loyalty SET points = 0 WHERE customer_id = ?',
      [customer_id]
    );

    await connection.commit();
    connection.release();

    const [newService] = await pool.query('SELECT * FROM services WHERE id = ?', [result.insertId]);

    res.status(201).json({ 
      message: 'Free service redeemed successfully! Loyalty points have been reset.',
      service: newService[0],
      previousPoints: loyalty[0].points,
      newPoints: 0
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
});

// Helper function to send notification
async function sendServiceCompletionNotification(service, customer, isFreeServiceEligible = false) {
  if (!customer) {
    console.warn('[Reson8] Skipping completion SMS - no customer linked to service.');
    return;
  }

  const formattedPhone = formatPhoneNumber(customer.phone);
  if (!formattedPhone) {
    console.warn(`[Reson8] Skipping completion SMS - invalid phone for customer ${customer.id}.`);
    return;
  }

  const feedbackUrl = buildFeedbackUrl({
    vehicleType: customer.vehicle_type || service.vehicle_type,
    customerId: customer.id,
    plate: customer.vehicle_plate,
  });

  const firstName = customer.name ? customer.name.split(' ')[0] : 'Customer';
  let message = `Hi ${firstName}, your ${service.service_name} service is complete. Thank you for choosing Sniper Car Care.`;

  if (feedbackUrl) {
    message += ` Share feedback: ${feedbackUrl}`;
  }

  if (isFreeServiceEligible) {
    message += ' 🎉 You now qualify for a FREE service — ask our team to redeem it!';
  }

  await sendReson8Message({
    to: formattedPhone,
    message,
    campaignName: 'SERVICE_COMPLETION',
    metadata: {
      serviceId: service.id,
      customerId: customer.id,
      loyaltyEligible: isFreeServiceEligible,
    },
  });
}

module.exports = {
  getServices,
  getService,
  createService,
  updateServiceStatus,
  deleteService,
  redeemFreeService
};

