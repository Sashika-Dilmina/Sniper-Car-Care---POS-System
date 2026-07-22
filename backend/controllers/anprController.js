const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendReson8Message } = require('../services/reson8Service');
const { buildCustomerWebsiteUrl, formatPhoneNumber, parsePlateComponents, findMatchingCustomer } = require('../utils/customerLinkUtils');

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

  // Check if plate has been scanned in the last 5 minutes (prevents duplicate camera triggers)
  const [recentScans] = await pool.query(
    'SELECT id FROM anpr_logs WHERE plate_number = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 1',
    [detectedPlate]
  );

  if (recentScans.length > 0) {
    console.log(`[ANPR] Plate ${detectedPlate} already scanned within last 5 minutes. Ignoring scan.`);
    return res.status(200).json({
      success: true,
      message: 'Plate already scanned in the last 5 minutes. Scan ignored.',
      plate_number: detectedPlate,
      skipped: true
    });
  }

  const mockProvince = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah'][Math.floor(Math.random() * 5)];
  const confidence = reqConfidence || (0.85 + Math.random() * 0.15).toFixed(2);

  // Strict matching on full plate & plate components (Emirate + Code + Number)
  const customer = await findMatchingCustomer(pool, detectedPlate);


  if (customer) {
    // Enforce one SMS/scan per customer account/vehicle per 24 hours
    const [recentCustScans] = await pool.query(`
      SELECT id FROM anpr_logs 
      WHERE customer_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
      LIMIT 1
    `, [customer.id]);

    // Update last seen (always update when scanned)
    await pool.query(
      'UPDATE customers SET last_seen = NOW() WHERE id = ?',
      [customer.id]
    );

    if (recentCustScans.length > 0) {
      console.log(`[ANPR] Customer account ID ${customer.id} already scanned in the last 24 hours. Logging scan but skipping SMS.`);
      
      // Save log but skip SMS (truncate plate to 100 chars)
      const safePlate = detectedPlate ? detectedPlate.substring(0, 100) : '';
      await pool.query(
        'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
        [safePlate, camera_id || 'HTTP_CAM', confidence, image_url || null, customer.id]
      );

      return res.status(200).json({
        success: true,
        message: 'Customer account already scanned in the last 24 hours. SMS skipped.',
        plate_number: detectedPlate,
        customer_name: customer.name,
        skipped: true
      });
    }

    // Save log FIRST to prevent race conditions before the slow SMS API call
    const safePlateNumber = detectedPlate ? detectedPlate.substring(0, 100) : '';
    await pool.query(
      'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
      [safePlateNumber, camera_id || 'HTTP_CAM', confidence, image_url || null, customer.id]
    );

    // Send SMS with product page link
    let smsSent = false;
    try {
      await sendProductPageSMS(customer, detectedPlate);
      smsSent = true;
    } catch (error) {
      console.error('Failed to send welcome SMS:', error.message);
    }

    return res.json({
      success: true,
      plate_number: detectedPlate,
      province: mockProvince,
      confidence,
      camera_id: camera_id || 'HTTP_CAM',
      image_url: image_url || null,
      customer_id: customer.id,
      customer_name: customer.name,
      sms_sent: smsSent
    });
  }

  // LOG THE DETECTION for unmatched vehicles (New Vehicles)
  const safePlateNumber = detectedPlate ? detectedPlate.substring(0, 100) : '';
  await pool.query(
    'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id) VALUES (?, ?, ?, ?, ?)',
    [safePlateNumber, camera_id || 'CAM-001', confidence, image_url || null, null]
  );

  res.json({
    success: true,
    plate_number: detectedPlate,
    province: mockProvince,
    confidence,
    camera_id: camera_id || 'CAM-001',
    image_url: image_url || null,
    customer_id: null,
    sms_sent: false
  });
});

// @desc    Get latest ANPR detections
// @route   GET /api/anpr/latest
// @access  Private
const getLatestDetections = asyncHandler(async (req, res) => {
  const [logs] = await pool.query(`
    SELECT l.*, 
           c.name as customer_name, 
           c.phone as customer_phone, 
           c.vehicle_plate as customer_vehicle_plate, 
           c.vehicle_type, 
           c.province as customer_province,
           c.last_seen as customer_last_seen,
           COALESCE(ly.points, 0) as loyalty_points,
           COALESCE(ly.wash_stamps, 0) as wash_stamps,
           (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as total_orders,
           (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.customer_id = c.id) as total_spent
    FROM anpr_logs l 
    LEFT JOIN customers c ON l.customer_id = c.id 
    LEFT JOIN loyalty ly ON c.id = ly.customer_id
    ORDER BY l.created_at DESC 
    LIMIT 25
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
  
  let finalPlate = plate_number || vehicle_plate;
  if (req.body.plate_code && req.body.emirate && req.body.plate_number) {
    finalPlate = `${req.body.plate_code} ${req.body.emirate} ${req.body.plate_number}`;
  }

  if (!finalPlate || !vehicle_type) {
    return res.status(400).json({ message: 'Plate number and vehicle type are required' });
  }

  // Check if exists using strict component matching
  const existingCustomer = await findMatchingCustomer(pool, finalPlate);
  if (existingCustomer) {
    return res.status(400).json({
      message: 'Vehicle already registered',
      customer: existingCustomer
    });
  }

  const finalProvince = province || req.body.emirate || null;

  // Create new customer
  const [result] = await pool.query(
    'INSERT INTO customers (name, phone, vehicle_plate, vehicle_type, province) VALUES (?, ?, ?, ?, ?)',
    [name || 'Unknown', phone || null, finalPlate, vehicle_type, finalProvince]
  );

  // Parse components and insert into vehicles table
  const { plateCode, emirate: parsedEmirate, plateNumber } = parsePlateComponents(finalPlate);
  try {
    await pool.query(
      'INSERT INTO vehicles (CustomerId, Emirate, PlateCode, PlateNumber, VehicleRegistrationNumber) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, parsedEmirate, plateCode, plateNumber, finalPlate]
    );
  } catch (vehErr) {
    console.error('[Database] Failed to insert into vehicles table during ANPR registration:', vehErr.message);
  }

  // Initialize loyalty
  await pool.query('INSERT INTO loyalty (customer_id, points) VALUES (?, ?)', [result.insertId, 0]);

  const [newCustomer] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);

  // Update ANY existing logs for this plate to point to this new customer
  await pool.query(`
    UPDATE anpr_logs 
    SET customer_id = ? 
    WHERE (plate_number = ? OR REPLACE(plate_number, ' ', '') = REPLACE(?, ' ', '')) 
      AND customer_id IS NULL
  `, [result.insertId, finalPlate, finalPlate]);

  // Send SMS with product page link for new customers too
  try {
    await sendProductPageSMS(newCustomer[0], finalPlate);
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

  const message = `يامرحبابك \nإختر خدمتك وخلنا نهتم بسيارتك بأسرع وقت\n${portalUrl}`;

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

// @desc    Manually check-in a customer, update details, write to ANPR log with note, and send welcome SMS
// @route   POST /api/anpr/manual-checkin
// @access  Private
const manualCheckIn = asyncHandler(async (req, res) => {
  const { customer_id, name, phone, vehicle_plate, vehicle_type, province, notes } = req.body;

  let finalPlate = vehicle_plate;
  if (req.body.plate_code && req.body.emirate && req.body.plate_number) {
    finalPlate = `${req.body.plate_code} ${req.body.emirate} ${req.body.plate_number}`;
  }

  if (!customer_id) {
    return res.status(400).json({ message: 'Customer ID is required' });
  }
  if (!finalPlate || !vehicle_type) {
    return res.status(400).json({ message: 'Vehicle plate and vehicle type are required' });
  }

  // 1. Fetch current customer
  const [customers] = await pool.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
  if (customers.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  // Check if another customer already has this vehicle plate (excluding current customer)
  const [existingPlate] = await pool.query(`
    SELECT DISTINCT c.id FROM customers c
    LEFT JOIN vehicles v ON c.id = v.CustomerId
    WHERE (c.vehicle_plate = ? 
       OR REPLACE(c.vehicle_plate, ' ', '') = REPLACE(?, ' ', '')
       OR v.VehicleRegistrationNumber = ?
       OR REPLACE(v.VehicleRegistrationNumber, ' ', '') = REPLACE(?, ' ', ''))
      AND c.id != ?
    LIMIT 1
  `, [finalPlate, finalPlate, finalPlate, finalPlate, customer_id]);

  if (existingPlate.length > 0) {
    return res.status(400).json({ message: 'Another customer with this vehicle plate already exists' });
  }

  const finalProvince = province || req.body.emirate || null;

  // 2. Update customer details and last_seen
  await pool.query(
    'UPDATE customers SET name = ?, phone = ?, vehicle_plate = ?, vehicle_type = ?, province = ?, last_seen = NOW() WHERE id = ?',
    [name || customers[0].name, phone || customers[0].phone, finalPlate, vehicle_type, finalProvince, customer_id]
  );

  // Sync vehicles table
  const { plateCode, emirate: parsedEmirate, plateNumber } = parsePlateComponents(finalPlate);
  try {
    const [existingVehicles] = await pool.query(
      'SELECT VehicleId FROM vehicles WHERE CustomerId = ? AND VehicleRegistrationNumber = ?',
      [customer_id, finalPlate]
    );
    if (existingVehicles.length === 0) {
      await pool.query(
        'INSERT INTO vehicles (CustomerId, Emirate, PlateCode, PlateNumber, VehicleRegistrationNumber) VALUES (?, ?, ?, ?, ?)',
        [customer_id, parsedEmirate, plateCode, plateNumber, finalPlate]
      );
    }
  } catch (vehErr) {
    console.error('[Database] Failed to sync vehicles table on manual check-in:', vehErr.message);
  }

  // Get the updated customer record
  const [updatedCustomers] = await pool.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
  const updatedCustomer = updatedCustomers[0];

  // 3. Log the detection to anpr_logs
  const checkinNote = notes || 'Camera offline - manual scan';
  await pool.query(
    'INSERT INTO anpr_logs (plate_number, camera_id, confidence, image_url, customer_id, notes, is_manual) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [finalPlate, 'MANUAL', 1.00, null, customer_id, checkinNote, 1]
  );

  // 4. Send welcome SMS with portal link
  let smsSent = false;
  let smsError = null;
  if (updatedCustomer.phone) {
    try {
      await sendProductPageSMS(updatedCustomer, finalPlate, vehicle_type);
      smsSent = true;
    } catch (error) {
      smsError = error.message;
      console.error('Failed to send manual check-in SMS:', error.message);
    }
  }

  res.json({
    success: true,
    message: 'Manual check-in completed successfully',
    customer: updatedCustomer,
    sms_sent: smsSent,
    sms_error: smsError
  });
});

// @desc    Manually assign or change customer for an ANPR log detection
// @route   POST /api/anpr/assign-customer
// @access  Private
const assignCustomerToLog = asyncHandler(async (req, res) => {
  const { log_id, customer_id } = req.body;

  if (!log_id || !customer_id) {
    return res.status(400).json({ message: 'log_id and customer_id are required' });
  }

  const [custRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
  if (custRows.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  await pool.query('UPDATE anpr_logs SET customer_id = ? WHERE id = ?', [customer_id, log_id]);

  res.json({
    success: true,
    message: 'Customer assigned successfully to detection log',
    customer: custRows[0]
  });
});

module.exports = {
  detectPlate,
  getLatestDetections,
  registerFromANPR,
  sendWelcomeFromDashboard,
  manualCheckIn,
  assignCustomerToLog,
};


