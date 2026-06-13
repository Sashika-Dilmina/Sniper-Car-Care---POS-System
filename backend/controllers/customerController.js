const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
  const { vehicle_type, payment_type, sort_orders, sort_loyalty } = req.query;
  
  let query = `
    SELECT c.*, 
           COUNT(DISTINCT o.id) as total_orders,
           COALESCE(SUM(o.total), 0) as total_spent,
           COALESCE(l.points, 0) as loyalty_points,
           COALESCE(l.wash_stamps, 0) as wash_stamps,
           (SELECT p2.method 
            FROM payments p2 
            INNER JOIN orders o2 ON p2.order_id = o2.id
            WHERE o2.customer_id = c.id 
            ORDER BY p2.created_at DESC 
            LIMIT 1) as last_payment_method
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    LEFT JOIN loyalty l ON c.id = l.customer_id
    WHERE 1=1
  `;
  const params = [];

  // Filter by vehicle type
  if (vehicle_type && vehicle_type !== 'all') {
    query += ' AND c.vehicle_type = ?';
    params.push(vehicle_type);
  }

  // Filter by payment type (customers who have used specific payment method)
  if (payment_type && payment_type !== 'all') {
    query += ' AND c.id IN (SELECT DISTINCT o3.customer_id FROM orders o3 INNER JOIN payments p3 ON o3.id = p3.order_id WHERE p3.method = ?)';
    params.push(payment_type);
  }

  query += ' GROUP BY c.id';

  // Apply sorting
  let orderBy = ' ORDER BY ';
  const orderClauses = [];

  if (sort_orders && sort_orders !== 'all') {
    orderClauses.push(`total_orders ${sort_orders === 'asc' ? 'ASC' : 'DESC'}`);
  }

  if (sort_loyalty && sort_loyalty !== 'all') {
    orderClauses.push(`loyalty_points ${sort_loyalty === 'asc' ? 'ASC' : 'DESC'}`);
  }

  // If no sorting is specified, default to most recent customers
  if (orderClauses.length > 0) {
    query += orderBy + orderClauses.join(', ');
  } else {
    query += orderBy + 'c.created_at DESC';
  }

  const [customers] = await pool.query(query, params);

  res.json({ customers });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [customers] = await pool.query(`
    SELECT c.*, 
           COALESCE(l.points, 0) as loyalty_points
    FROM customers c
    LEFT JOIN loyalty l ON c.id = l.customer_id
    WHERE c.id = ?
  `, [id]);

  if (customers.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  // Get customer orders
  const [orders] = await pool.query(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
    [id]
  );

  res.json({ customer: customers[0], orders });
});

// Helper to parse Plate string into Emirate, Code and Plate Number
function parsePlateComponents(plateStr) {
  if (!plateStr) return { plateCode: '', emirate: 'Dubai', plateNumber: '' };
  
  const parts = plateStr.trim().split(/\s+/);
  if (parts.length >= 3) {
    const plateCode = parts[0];
    const plateNumber = parts[parts.length - 1];
    const emirate = parts.slice(1, parts.length - 1).join(' ');
    return { plateCode, emirate, plateNumber };
  }
  
  // Fallback if formatting doesn't match
  return { plateCode: '', emirate: 'Dubai', plateNumber: plateStr };
}

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, vehicle_plate, vehicle_type, province } = req.body;

  let finalPlate = vehicle_plate;
  if (req.body.plate_code && req.body.emirate && req.body.plate_number) {
    finalPlate = `${req.body.plate_code} ${req.body.emirate} ${req.body.plate_number}`;
  }

  if (!name || !phone || !finalPlate || !vehicle_type) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  // Check if customer with same plate exists
  const [existing] = await pool.query(
    'SELECT id FROM customers WHERE vehicle_plate = ?',
    [finalPlate]
  );

  if (existing.length > 0) {
    return res.status(400).json({ message: 'Customer with this vehicle plate already exists' });
  }

  const finalProvince = province || req.body.emirate || null;

  const [result] = await pool.query(
    'INSERT INTO customers (name, phone, vehicle_plate, vehicle_type, province) VALUES (?, ?, ?, ?, ?)',
    [name, phone, finalPlate, vehicle_type, finalProvince]
  );

  // Parse components and insert into vehicles table
  const { plateCode, emirate: parsedEmirate, plateNumber } = parsePlateComponents(finalPlate);
  try {
    await pool.query(
      'INSERT INTO vehicles (CustomerId, Emirate, PlateCode, PlateNumber, VehicleRegistrationNumber) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, parsedEmirate, plateCode, plateNumber, finalPlate]
    );
  } catch (vehErr) {
    console.error('[Database] Failed to insert into vehicles table:', vehErr.message);
  }

  // Initialize loyalty points
  await pool.query('INSERT INTO loyalty (customer_id, points) VALUES (?, ?)', [result.insertId, 0]);

  const [newCustomer] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);

  res.status(201).json({ message: 'Customer created successfully', customer: newCustomer[0] });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, vehicle_plate, vehicle_type, province } = req.body;

  const [customers] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
  if (customers.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  let finalPlate = vehicle_plate;
  if (req.body.plate_code && req.body.emirate && req.body.plate_number) {
    finalPlate = `${req.body.plate_code} ${req.body.emirate} ${req.body.plate_number}`;
  }
  const finalProvince = province || req.body.emirate || null;

  await pool.query(
    'UPDATE customers SET name = ?, phone = ?, vehicle_plate = ?, vehicle_type = ?, province = ? WHERE id = ?',
    [name, phone, finalPlate, vehicle_type, finalProvince, id]
  );

  // Sync vehicles table
  const { plateCode, emirate: parsedEmirate, plateNumber } = parsePlateComponents(finalPlate);
  try {
    const [existingVehicles] = await pool.query(
      'SELECT VehicleId FROM vehicles WHERE CustomerId = ? AND VehicleRegistrationNumber = ?',
      [id, finalPlate]
    );
    
    if (existingVehicles.length === 0) {
      await pool.query(
        'INSERT INTO vehicles (CustomerId, Emirate, PlateCode, PlateNumber, VehicleRegistrationNumber) VALUES (?, ?, ?, ?, ?)',
        [id, parsedEmirate, plateCode, plateNumber, finalPlate]
      );
    }
  } catch (vehErr) {
    console.error('[Database] Failed to sync vehicles table on update:', vehErr.message);
  }

  const [updated] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);

  res.json({ message: 'Customer updated successfully', customer: updated[0] });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [customers] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
  if (customers.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  await pool.query('DELETE FROM customers WHERE id = ?', [id]);

  res.json({ message: 'Customer deleted successfully' });
});

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
};

