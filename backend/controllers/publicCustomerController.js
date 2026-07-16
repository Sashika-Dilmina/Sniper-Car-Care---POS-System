const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { getWashStamps } = require('../utils/loyaltyStamps');

// Helper to resolve customer by plate with fallback matching
async function resolveCustomerByPlate(plate) {
  if (!plate) return null;

  const cleanPlate = plate.replace(/\s+/g, '');
  
  // 1. Try direct exact match
  const [customers] = await pool.query(
    `SELECT DISTINCT c.* FROM customers c
     LEFT JOIN vehicles v ON c.id = v.CustomerId
     WHERE c.vehicle_plate = ?
        OR REPLACE(c.vehicle_plate, ' ', '') = ?
        OR v.VehicleRegistrationNumber = ?
        OR REPLACE(v.VehicleRegistrationNumber, ' ', '') = ?
     LIMIT 1`,
    [plate, cleanPlate, plate, cleanPlate]
  );

  if (customers.length > 0) {
    return customers[0];
  }

  // 2. Try parsing and robust matching fallback
  const { parsePlateComponents } = require('../utils/customerLinkUtils');
  const { plateCode, emirate, plateNumber: parsedPlateNum } = parsePlateComponents(plate);
  
  if (parsedPlateNum) {
    // A. Match by PlateNumber and PlateCode
    const [fallbackCustomers] = await pool.query(
      `SELECT DISTINCT c.* FROM customers c
       JOIN vehicles v ON c.id = v.CustomerId
       WHERE v.PlateNumber = ? AND (v.PlateCode = ? OR (? = '' AND (v.PlateCode = '' OR v.PlateCode IS NULL)))
       LIMIT 1`,
      [parsedPlateNum, plateCode, plateCode]
    );
    
    if (fallbackCustomers.length > 0) {
      return fallbackCustomers[0];
    }

    // B. Check if PlateNumber is unique in database to allow loose fallback
    const [countVehicles] = await pool.query(
      `SELECT COUNT(DISTINCT CustomerId) as count FROM vehicles WHERE PlateNumber = ?`,
      [parsedPlateNum]
    );
    
    const [countCustomers] = await pool.query(
      `SELECT COUNT(id) as count FROM customers WHERE REPLACE(vehicle_plate, ' ', '') LIKE ?`,
      [`%${parsedPlateNum}`]
    );
    
    const totalMatches = (countVehicles[0]?.count || 0) + (countCustomers[0]?.count || 0);
    
    if (totalMatches === 1) {
      const [numberOnlyCustomers] = await pool.query(
        `SELECT DISTINCT c.* FROM customers c
         JOIN vehicles v ON c.id = v.CustomerId
         WHERE v.PlateNumber = ?
         LIMIT 1`,
        [parsedPlateNum]
      );
      if (numberOnlyCustomers.length > 0) {
        return numberOnlyCustomers[0];
      }

      const [custByPlate] = await pool.query(
        `SELECT * FROM customers WHERE REPLACE(vehicle_plate, ' ', '') LIKE ? LIMIT 1`,
        [`%${parsedPlateNum}`]
      );
      if (custByPlate.length > 0) {
        return custByPlate[0];
      }
    }
  }

  return null;
}

// @desc    Get customer by vehicle plate (public)
// @route   GET /api/public/customer/by-plate
// @access  Public
const getCustomerByPlate = asyncHandler(async (req, res) => {
  const { plate } = req.query;

  if (!plate) {
    return res.status(400).json({ message: 'Vehicle plate is required' });
  }

  const customer = await resolveCustomerByPlate(plate);

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  customer.emirate = customer.province;
  let wash_stamps = 0;
  let free_wash_cap = 0;

  try {
    wash_stamps = await getWashStamps(pool, customer.id);
    if (wash_stamps >= 5) {
      const { calculateFreeWashCap } = require('../utils/freeWashCap');
      free_wash_cap = await calculateFreeWashCap(pool, customer.id);
    }
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') {
      throw err;
    }
  }

  res.json({
    customer: { ...customer, wash_stamps },
    loyalty: { wash_stamps, free_wash_ready: wash_stamps >= 5, free_wash_cap },
  });
});

// @desc    Get customer by ID (public)
// @route   GET /api/public/customer/by-id
// @access  Public
const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Customer ID is required' });
  }

  const [customers] = await pool.query(
    'SELECT * FROM customers WHERE id = ?',
    [id]
  );

  if (customers.length === 0) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  const customer = customers[0];
  customer.emirate = customer.province;
  let wash_stamps = 0;
  let free_wash_cap = 0;

  try {
    wash_stamps = await getWashStamps(pool, customer.id);
    if (wash_stamps >= 5) {
      const { calculateFreeWashCap } = require('../utils/freeWashCap');
      free_wash_cap = await calculateFreeWashCap(pool, customer.id);
    }
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') {
      throw err;
    }
  }

  res.json({
    customer: { ...customer, wash_stamps },
    loyalty: { wash_stamps, free_wash_ready: wash_stamps >= 5, free_wash_cap },
  });
});

// @desc    Get customer orders (public)
// @route   GET /api/public/customer/orders
// @access  Public
const getCustomerOrders = asyncHandler(async (req, res) => {
  const { plate, id } = req.query;

  if (!plate && !id) {
    return res.status(400).json({ message: 'Customer ID or Vehicle plate is required' });
  }

  let customerId = id;

  if (!customerId) {
    const customer = await resolveCustomerByPlate(plate);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    customerId = customer.id;
  }

  // Get customer phone number to search for associated VIP bookings
  let phone = null;
  const [custRows] = await pool.query('SELECT phone FROM customers WHERE id = ?', [customerId]);
  if (custRows.length > 0) {
    phone = custRows[0].phone;
  }

  let query = 'SELECT * FROM orders WHERE customer_id = ?';
  let queryParams = [customerId];

  if (phone) {
    query += ` OR vip_booking_id IN (
      SELECT vb.id 
      FROM vip_bookings vb 
      JOIN vip_customers vc ON vb.vip_customer_id = vc.id 
      WHERE vc.phone = ?
    )`;
    queryParams.push(phone);
  }
  
  query += ' ORDER BY created_at DESC';
  const [orders] = await pool.query(query, queryParams);

  // Fetch items for each order
  const orderIds = orders.map(o => o.id);
  let allItems = [];
  
  if (orderIds.length > 0) {
    const [items] = await pool.query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id IN (?)',
      [orderIds]
    );
    allItems = items;

    // Check if any order has empty items and fetch from services instead
    for (let order of orders) {
      const orderItems = allItems.filter(item => item.order_id === order.id);
      if (orderItems.length === 0) {
        const [services] = await pool.query(
          'SELECT id, service_name, price FROM services WHERE order_id = ?',
          [order.id]
        );
        if (services.length > 0) {
          const serviceItems = services.map(s => ({
            id: `svc_${s.id}`,
            order_id: order.id,
            product_name: order.payment_status === 'free' ? `${s.service_name} (Free Wash)` : s.service_name,
            quantity: 1,
            price: order.payment_status === 'free' ? 0.00 : s.price,
            category: 'Services'
          }));
          allItems.push(...serviceItems);
        }
      }
    }
  }

  const formattedOrders = orders.map(order => ({
    ...order,
    items: allItems.filter(item => item.order_id === order.id)
  }));

  res.json({
    orders: formattedOrders
  });
});

// @desc    Get notifications for customer (public)
// @route   GET /api/public/customer/notifications
// @access  Public
const getCustomerNotifications = asyncHandler(async (req, res) => {
  const { plate } = req.query;

  if (!plate) {
    return res.status(400).json({ message: 'Vehicle plate is required' });
  }

  const customer = await resolveCustomerByPlate(plate);
  
  let query = 'SELECT * FROM customer_notifications WHERE vehicle_plate = ? OR REPLACE(vehicle_plate, \' \', \'\') = ?';
  let queryParams = [plate, plate.replace(/\s+/g, '')];

  if (customer && customer.vehicle_plate) {
    query += ' OR vehicle_plate = ? OR REPLACE(vehicle_plate, \' \', \'\') = ?';
    queryParams.push(customer.vehicle_plate, customer.vehicle_plate.replace(/\s+/g, ''));
  }

  query += ' ORDER BY created_at DESC LIMIT 50';
  const [notifications] = await pool.query(query, queryParams);

  res.json({
    success: true,
    notifications
  });
});

// @desc    Mark customer notifications as read (public)
// @route   POST /api/public/customer/notifications/mark-read
// @access  Public
const markNotificationsAsRead = asyncHandler(async (req, res) => {
  const { plate } = req.body;

  if (!plate) {
    return res.status(400).json({ message: 'Vehicle plate is required' });
  }

  const customer = await resolveCustomerByPlate(plate);
  
  let query = 'UPDATE customer_notifications SET is_read = 1 WHERE (vehicle_plate = ? OR REPLACE(vehicle_plate, \' \', \'\') = ?)';
  let queryParams = [plate, plate.replace(/\s+/g, '')];

  if (customer && customer.vehicle_plate) {
    query += ' OR vehicle_plate = ? OR REPLACE(vehicle_plate, \' \', \'\') = ?';
    queryParams.push(customer.vehicle_plate, customer.vehicle_plate.replace(/\s+/g, ''));
  }

  // Wrap existing conditions in parenthesis for proper precedence with AND is_read = 0
  const finalQuery = `UPDATE customer_notifications SET is_read = 1 WHERE (${query.split(' WHERE ')[1]}) AND is_read = 0`;
  await pool.query(finalQuery, queryParams);

// @desc    Register or update customer from public forms (via QR code)
// @route   POST /api/public/customer/register
// @access  Public
const registerCustomer = asyncHandler(async (req, res) => {
  const { name, phone, vehicle_plate, vehicle_type, province } = req.body;

  if (!name || !phone || !vehicle_plate || !vehicle_type || !province) {
    return res.status(400).json({ message: 'Name, phone, vehicle plate, vehicle type, and emirate are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if customer already exists by plate
    const [existing] = await connection.query(
      'SELECT id FROM customers WHERE vehicle_plate = ?',
      [vehicle_plate]
    );

    let customerId;
    if (existing.length > 0) {
      customerId = existing[0].id;
      // Update existing customer info
      await connection.query(
        'UPDATE customers SET name = ?, phone = ?, vehicle_type = ?, province = ? WHERE id = ?',
        [name, phone, vehicle_type, province, customerId]
      );
      
      // Also update vehicles table if exists
      const { parsePlateComponents } = require('../utils/customerLinkUtils');
      const { plateCode, plateNumber } = parsePlateComponents(vehicle_plate);
      
      await connection.query(
        `INSERT INTO vehicles (CustomerId, VehicleRegistrationNumber, PlateCode, PlateNumber, Emirate)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE VehicleRegistrationNumber = VALUES(VehicleRegistrationNumber), PlateCode = VALUES(PlateCode), PlateNumber = VALUES(PlateNumber), Emirate = VALUES(Emirate)`,
        [customerId, vehicle_plate, plateCode || '', plateNumber || '', province]
      );
      
      await connection.commit();
      return res.status(200).json({
        success: true,
        message: 'Customer information updated successfully',
        customer_id: customerId
      });
    }

    // Insert new customer
    const [result] = await connection.query(
      'INSERT INTO customers (name, phone, vehicle_plate, vehicle_type, province) VALUES (?, ?, ?, ?, ?)',
      [name, phone, vehicle_plate, vehicle_type, province]
    );
    customerId = result.insertId;

    // Create entry in vehicles table
    const { parsePlateComponents } = require('../utils/customerLinkUtils');
    const { plateCode, plateNumber } = parsePlateComponents(vehicle_plate);

    await connection.query(
      'INSERT INTO vehicles (CustomerId, VehicleRegistrationNumber, PlateCode, PlateNumber, Emirate) VALUES (?, ?, ?, ?, ?)',
      [customerId, vehicle_plate, plateCode || '', plateNumber || '', province]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer_id: customerId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in public customer register:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = {
  getCustomerByPlate,
  getCustomerById,
  getCustomerOrders,
  getCustomerNotifications,
  markNotificationsAsRead,
  registerCustomer
};

