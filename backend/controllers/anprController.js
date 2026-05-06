const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { buildCustomerWebsiteUrl, formatPhoneNumber } = require('../utils/customerLinkUtils');

// @desc    Mock ANPR detection - simulate camera plate recognition
// @route   POST /api/anpr/detect
// @access  Private
const detectPlate = asyncHandler(async (req, res) => {
  // Capture data from real camera or simulation
  // Supporting both 'plateNumber' (camera format) and 'plate_number' (alternate format)
  const { plateNumber, plate_number, image_url, camera_id, confidence: reqConfidence } = req.body;

  let detectedPlate = plateNumber || plate_number;
  let isMock = false;

  // If no plate provided (test from dashboard), generate mock
  if (!detectedPlate) {
    detectedPlate = generateMockPlateNumber();
    isMock = true;
  }

  const mockProvince = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah'][Math.floor(Math.random() * 5)];
  const confidence = reqConfidence || (0.85 + Math.random() * 0.15).toFixed(2);

  // Try to find existing customer with this plate
  const [customers] = await pool.query(
    'SELECT * FROM customers WHERE vehicle_plate = ?',
    [detectedPlate]
  );

  let customer = null;
  if (customers.length > 0) {
    customer = customers[0];

    // Update last seen
    await pool.query(
      'UPDATE customers SET last_seen = NOW() WHERE id = ?',
      [customer.id]
    );

    // Send SMS with product page link
    try {
      await sendProductPageSMS(customer, detectedPlate);
    } catch (error) {
      console.error('Failed to send welcome SMS:', error.message);
    }
  }

  // LOG THE DETECTION (Always save to anpr_logs for frontend to pick up)
  await pool.query(
    'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
    [detectedPlate, camera_id || 'CAM-001', confidence, image_url || null, customer?.id || null]
  );

  res.json({
    success: true,
    plate_number: detectedPlate,
    province: mockProvince,
    confidence,
    camera_id: camera_id || 'CAM-001',
    timestamp: new Date().toISOString(),
    existing_customer: customer,
    is_simulation: isMock
  });
});

// @desc    Get latest ANPR detections
// @route   GET /api/anpr/latest
// @access  Private
const getLatestDetections = asyncHandler(async (req, res) => {
  const [logs] = await pool.query(`
    SELECT l.*, c.name as customer_name, c.phone as customer_phone, c.vehicle_type 
    FROM anpr_logs l 
    LEFT JOIN customers c ON l.customer_id = c.id 
    ORDER BY l.created_at DESC 
    LIMIT 10
  `);

  res.json({
    success: true,
    detections: logs
  });
});

// @desc    Register vehicle from ANPR
// @route   POST /api/anpr/register
// @access  Private
const registerFromANPR = asyncHandler(async (req, res) => {
  const { plate_number, vehicle_plate, province, vehicle_type, name, phone } = req.body;
  const plateToRegister = plate_number || vehicle_plate;

  if (!plateToRegister || !vehicle_type) {
    return res.status(400).json({ message: 'Plate number and vehicle type are required' });
  }

  // Check if exists
  const [existing] = await pool.query(
    'SELECT * FROM customers WHERE vehicle_plate = ?',
    [plateToRegister]
  );

  if (existing.length > 0) {
    return res.status(400).json({
      message: 'Vehicle already registered',
      customer: existing[0]
    });
  }

  // Create new customer
  const [result] = await pool.query(
    'INSERT INTO customers (name, phone, vehicle_plate, vehicle_type, province) VALUES (?, ?, ?, ?, ?)',
    [name || 'Unknown', phone || null, plateToRegister, vehicle_type, province || null]
  );

  // Initialize loyalty
  await pool.query('INSERT INTO loyalty (customer_id, points) VALUES (?, ?)', [result.insertId, 0]);

  const [newCustomer] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);

  // Update ANY existing logs for this plate to point to this new customer
  await pool.query(
    'UPDATE anpr_logs SET customer_id = ? WHERE plate_number = ? AND customer_id IS NULL',
    [result.insertId, plateToRegister]
  );

  // Send SMS with product page link for new customers too
  try {
    await sendProductPageSMS(newCustomer[0], plateToRegister);
  } catch (error) {
    console.error('Failed to send welcome SMS:', error.message);
  }

  res.status(201).json({
    message: 'Vehicle registered successfully',
    customer: newCustomer[0]
  });
});

// @desc    Manually resend welcome link to customer
// @route   POST /api/anpr/send-welcome
// @access  Private
const sendWelcomeFromDashboard = asyncHandler(async (req, res) => {
  const { customer_id, plate_number, vehicle_type } = req.body;

  if (!customer_id && !plate_number) {
    return res.status(400).json({
      message: 'customer_id or plate_number is required to send welcome message',
    });
  }

  let customer = null;
  if (customer_id) {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (rows.length > 0) {
      customer = rows[0];
    }
  }

  if (!customer && plate_number) {
    const [rows] = await pool.query('SELECT * FROM customers WHERE vehicle_plate = ?', [plate_number]);
    if (rows.length > 0) {
      customer = rows[0];
    }
  }

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found for welcome message' });
  }

  await sendProductPageSMS(customer, plate_number || customer.vehicle_plate, vehicle_type);

  res.json({ message: 'Welcome message sent successfully via Reson8' });
});

// Helper function to send SMS with product page link
async function sendProductPageSMS(customer, plateNumber, vehicleTypeOverride) {
  if (!customer?.phone) {
    console.warn('[Reson8] Skipping welcome message - customer has no phone.');
    return { skipped: true, reason: 'missing_phone' };
  }

  const targetVehicleType = vehicleTypeOverride || customer.vehicle_type || 'Saloon';
  const formattedPhone = formatPhoneNumber(customer.phone);
  if (!formattedPhone) {
    console.warn(`[Reson8] Unable to format phone number for customer ${customer.id}.`);
    return { skipped: true, reason: 'invalid_phone' };
  }

  const portalUrl = buildCustomerWebsiteUrl(targetVehicleType, plateNumber || customer.vehicle_plate);

  const firstName = customer.name ? customer.name.split(' ')[0] : 'there';
  const message = [
    `Welcome ${firstName}!`,
    'Select your service with one tap:',
    portalUrl,
  ].join(' ');

  const metadata = {
    type: 'welcome',
    plate: plateNumber || customer.vehicle_plate,
    vehicleType: targetVehicleType,
  };

  return sendReson8Message({
    to: formattedPhone,
    message,
    campaignName: 'ANPR_WELCOME',
    metadata,
  });
}

// Helper function to generate mock plate numbers
function generateMockPlateNumber() {
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const digits = '0123456789';

  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const num1 = digits[Math.floor(Math.random() * digits.length)];
  const num2 = digits[Math.floor(Math.random() * digits.length)];
  const num3 = digits[Math.floor(Math.random() * digits.length)];
  const num4 = digits[Math.floor(Math.random() * digits.length)];

  return `${letter1}${letter2}${num1}${num2}${num3}${num4}`;
}

module.exports = {
  detectPlate,
  getLatestDetections,
  registerFromANPR,
  sendWelcomeFromDashboard,
};

