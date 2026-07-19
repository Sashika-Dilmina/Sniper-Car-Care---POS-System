const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { generatePDFReport } = require('../utils/pdfReportGenerator');

// Helper function to send Excel file
const sendExcelFile = (res, workbook, filename) => {
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(excelBuffer);
};

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const { period = 'today', start_date, end_date } = req.query; // today, week, month, year

  let dateFilter = '';

  if (start_date && end_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(start_date) && dateRegex.test(end_date)) {
      dateFilter = `DATE(created_at) BETWEEN '${start_date}' AND '${end_date}'`;
    } else {
      dateFilter = "DATE(created_at) = CURDATE()";
    }
  } else {
    switch (period) {
      case 'today':
        dateFilter = 'DATE(created_at) = CURDATE()';
        break;
      case 'week':
        dateFilter = 'YEARWEEK(created_at) = YEARWEEK(CURDATE())';
        break;
      case 'month':
        dateFilter = 'YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())';
        break;
      case 'year':
        dateFilter = 'YEAR(created_at) = YEAR(CURDATE())';
        break;
      default:
        dateFilter = 'DATE(created_at) = CURDATE()';
    }
  }

  // Payment breakdown by method - use payment date filter
  let paymentDateFilter = dateFilter.replace(/created_at/g, 'p.created_at');
  let paymentBreakdown;
  try {
    const [paymentResult] = await pool.query(
      `SELECT 
        CASE 
          WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
          WHEN p.method IN ('mastercard', 'master_card', 'master') THEN 'card'
          ELSE p.method 
        END as method,
        COALESCE(SUM(p.amount), 0) as total_amount
       FROM payments p
       WHERE ${paymentDateFilter} AND p.status = 'completed'
       GROUP BY 
        CASE 
          WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
          WHEN p.method IN ('mastercard', 'master_card', 'master') THEN 'card'
          ELSE p.method 
        END`
    );
    paymentBreakdown = paymentResult;
  } catch (error) {
    console.error('Payment breakdown query error:', error);
    paymentBreakdown = [];
  }

  // Calculate totals for each payment method
  const cardPayments = paymentBreakdown.find(item => item.method === 'card')?.total_amount || 0;
  const cashPayments = paymentBreakdown.find(item => item.method === 'cash')?.total_amount || 0;
  const creditPayments = paymentBreakdown.find(item => item.method === 'credit')?.total_amount || 0;
  
  // Total profit = sum of all completed payments (card + cash + credit)
  const totalProfit = cardPayments + cashPayments + creditPayments;

  // Orders by vehicle type
  let ordersByVehicleType;
  try {
    const [vehicleTypeResult] = await pool.query(
      `SELECT 
        COALESCE(c.vehicle_type, vc.vehicle_type) as vehicle_type,
        COUNT(*) as order_count
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
       LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
       WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')}
       GROUP BY COALESCE(c.vehicle_type, vc.vehicle_type)
       HAVING vehicle_type IS NOT NULL`
    );
    ordersByVehicleType = vehicleTypeResult;
  } catch (error) {
    console.error('Vehicle type orders query error:', error);
    ordersByVehicleType = [];
  }

  // Calculate totals for each vehicle type
  const fourWheelOrders = ordersByVehicleType.find(item => item.vehicle_type === '4x4')?.order_count || 0;
  const saloonOrders = ordersByVehicleType.find(item => item.vehicle_type === 'Saloon')?.order_count || 0;

  // Services completed
  try {
    const [servicesResult] = await pool.query(
      `SELECT COUNT(*) as completed_services 
       FROM services WHERE ${dateFilter} AND status = 'completed'`
    );
    services = servicesResult;
  } catch (error) {
    console.error('Services query error:', error);
    services = [{ completed_services: 0 }];
  }

  // Total customers
  try {
    const [customersResult] = await pool.query(
      `SELECT COUNT(*) as total_customers FROM customers WHERE ${dateFilter}`
    );
    customers = customersResult;
  } catch (error) {
    console.error('Customers query error:', error);
    customers = [{ total_customers: 0 }];
  }

  // Pending payments
  let pendingPayments;
  try {
    const [pendingResult] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as pending_amount, COUNT(*) as pending_count 
       FROM orders WHERE ${dateFilter} AND payment_status = 'pending'`
    );
    pendingPayments = pendingResult;
  } catch (error) {
    console.error('Pending payments query error:', error);
    pendingPayments = [{ pending_amount: 0, pending_count: 0 }];
  }

  // Pending orders by vehicle type (statuses: 'pending', 'processing'), excluding VIP bookings
  let pendingSaloonCount = 0;
  let pending4x4Count = 0;
  try {
    const [pendingVehiclesResult] = await pool.query(
      `SELECT 
        COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') as vehicleType,
        COUNT(*) as count
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
       LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
        WHERE o.status IN ('pending', 'processing') 
          AND o.vip_booking_id IS NULL
          AND ${dateFilter.replace(/created_at/g, 'o.created_at')}
          AND (
            EXISTS (SELECT 1 FROM services s WHERE s.order_id = o.id)
            OR
            EXISTS (SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id AND p.category = 'Services')
          )
       GROUP BY COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon')`
    );
    pendingSaloonCount = pendingVehiclesResult.find(item => item.vehicleType === 'Saloon')?.count || 0;
    pending4x4Count = pendingVehiclesResult.find(item => item.vehicleType === '4x4')?.count || 0;
  } catch (error) {
    console.error('Pending vehicles count query error:', error);
  }

  // Pending VIP bookings
  let pendingVipCount = 0;
  try {
    const [pendingVipResult] = await pool.query(
      `SELECT COUNT(*) as count
       FROM orders o
         WHERE o.status IN ('pending', 'processing') 
           AND o.vip_booking_id IS NOT NULL
           AND ${dateFilter.replace(/created_at/g, 'o.created_at')}
          AND (
           EXISTS (SELECT 1 FROM services s WHERE s.order_id = o.id)
           OR
           EXISTS (SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id AND p.category = 'Services')
         )`
    );
    pendingVipCount = pendingVipResult[0]?.count || 0;
  } catch (error) {
    console.error('Pending VIP count query error:', error);
  }

  // Recent orders (latest 5)
  let recentOrdersList = [];
  try {
    const [recentResult] = await pool.query(`
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
      ORDER BY o.created_at DESC
      LIMIT 5
    `);
    
    // Get order items for each recent order
    for (let ord of recentResult) {
      const [items] = await pool.query(`
        SELECT oi.*, p.name as product_name, p.category
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [ord.id]);
      ord.items = items;
    }
    recentOrdersList = recentResult;
  } catch (error) {
    console.error('Recent orders query error:', error);
  }

  // New customers (most recent 10 overall)
  let newCustomers = [];
  try {
    const [newCustomersResult] = await pool.query(`
      SELECT c.id, c.name, c.phone, c.vehicle_plate, c.vehicle_type, 
             DATE_FORMAT(c.created_at, '%Y-%m-%d') as joined_date
      FROM customers c
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    newCustomers = newCustomersResult;
  } catch (error) {
    console.error('New customers query error:', error);
    newCustomers = [];
  }

  // Top customers
  let topCustomers = [];
  try {
    const [topCustomersResult] = await pool.query(`
      SELECT c.id, c.name, c.vehicle_plate,
             COUNT(DISTINCT o.id) as order_count,
             COALESCE(SUM(o.total), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5
    `);
    topCustomers = topCustomersResult;
  } catch (error) {
    console.error('Top customers query error:', error);
    topCustomers = [];
  }

  // Top services
  let topServices = [];
  try {
    const [topServicesResult] = await pool.query(`
      SELECT service_name,
             COUNT(*) as service_count,
             SUM(price) as total_revenue
      FROM services
      WHERE ${dateFilter} AND status = 'completed'
      GROUP BY service_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `);
    topServices = topServicesResult;
  } catch (error) {
    console.error('Top services query error:', error);
    topServices = [];
  }

  // Sales by day (last 7 days)
  let salesByDay = [];
  try {
    const [salesByDayResult] = await pool.query(`
      SELECT DATE(created_at) as date,
             COALESCE(SUM(CASE WHEN payment_status = 'free' THEN discount ELSE total END), 0) as sales,
             COUNT(*) as orders
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND payment_status IN ('paid', 'free')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    salesByDay = salesByDayResult;
  } catch (error) {
    console.error('Sales by day query error:', error);
    salesByDay = [];
  }

  // Category revenue (paid and free orders)
  let categoryRevenue = [];
  try {
    const [categoryRevenueResult] = await pool.query(`
      SELECT p.category, COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} AND o.payment_status IN ('paid', 'free')
      GROUP BY p.category
      ORDER BY revenue DESC
    `);
    categoryRevenue = categoryRevenueResult;
  } catch (error) {
    console.error('Category revenue query error:', error);
    categoryRevenue = [];
  }

  // Recent feedback (for admin dashboard)
  let recentFeedback = [];
  try {
    const [feedbackResult] = await pool.query(`
      SELECT f.*,
             c.name as customer_name,
             c.phone as customer_phone,
             c.vehicle_plate,
             c.vehicle_type
      FROM feedback f
      LEFT JOIN customers c ON f.customer_id = c.id
      ORDER BY f.created_at DESC
      LIMIT 10
    `);
    recentFeedback = feedbackResult;
  } catch (error) {
    console.error('Feedback query error:', error);
    recentFeedback = [];
  }

  res.json({
    period,
    summary: {
      total_card_payments: parseFloat(cardPayments || 0),
      total_cash_payments: parseFloat(cashPayments || 0),
      total_profit: parseFloat(totalProfit || 0),
      four_wheel_orders: parseInt(fourWheelOrders || 0),
      saloon_orders: parseInt(saloonOrders || 0),
      completed_services: parseInt(services[0]?.completed_services || 0),
      total_customers: parseInt(customers[0]?.total_customers || 0),
      pending_amount: parseFloat(pendingPayments[0]?.pending_amount || 0),
      pending_count: parseInt(pendingPayments[0]?.pending_count || 0),
      pending_saloon_count: parseInt(pendingSaloonCount || 0),
      pending_4x4_count: parseInt(pending4x4Count || 0),
      pending_vip_count: parseInt(pendingVipCount || 0)
    },
    top_customers: topCustomers || [],
    top_services: topServices || [],
    sales_by_day: salesByDay || [],
    category_revenue: categoryRevenue || [],
    new_customers: newCustomers || [],
    recent_feedback: recentFeedback || [],
    recent_orders: recentOrdersList || []
  });
});

// @desc    Get sales report
// @route   GET /api/analytics/reports/sales
// @access  Private
const getSalesReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, format = 'json' } = req.query;

  let query = `
    SELECT o.*,
           c.name as customer_name,
           c.vehicle_plate,
           COUNT(DISTINCT oi.id) as item_count
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.payment_status IN ('paid', 'free')
  `;
  const params = [];

  if (start_date) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }

  query += ' GROUP BY o.id ORDER BY o.created_at DESC';

  const [orders] = await pool.query(query, params);

  // Calculate totals
  const totalRevenue = orders.reduce((sum, order) => {
    const val = order.payment_status === 'free' ? parseFloat(order.discount || 0) : parseFloat(order.total || 0);
    return sum + val;
  }, 0);
  const totalOrders = orders.length;

  const report = {
    period: {
      start_date: start_date || null,
      end_date: end_date || null
    },
    summary: {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      average_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0
    },
    orders: orders
  };

  if (format === 'csv') {
    // In production, generate CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
    // Simple CSV implementation
    let csv = 'Order ID,Date,Customer,Vehicle Plate,Total,Status\n';
    orders.forEach(order => {
      csv += `${order.id},${order.created_at},${order.customer_name || 'N/A'},${order.vehicle_plate || 'N/A'},${order.total},${order.payment_status}\n`;
    });
    return res.send(csv);
  }

  res.json(report);
});

// @desc    Get daily business summary
// @route   GET /api/analytics/reports/daily-summary
// @access  Private
const getDailyBusinessSummary = asyncHandler(async (req, res) => {
  const { date, format = 'json' } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Find register sessions opened on targetDate
  const [sessions] = await pool.query(
    "SELECT DATE_FORMAT(opened_at, '%Y-%m-%d %H:%i:%s') as opened_at, DATE_FORMAT(closed_at, '%Y-%m-%d %H:%i:%s') as closed_at FROM cash_registers WHERE DATE(opened_at) = ? ORDER BY opened_at ASC",
    [targetDate]
  );
  
  let useSession = false;
  let startTime, endTime;
  if (sessions.length > 0) {
    useSession = true;
    startTime = sessions[0].opened_at;
    endTime = sessions[sessions.length - 1].closed_at;
  }

  // Orders summary
  const [ordersSummary] = await pool.query(
    useSession
      ? `SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(CASE WHEN payment_status = 'free' THEN discount ELSE total END), 0) as total_revenue,
          COALESCE(SUM(discount), 0) as total_discounts,
          COUNT(CASE WHEN payment_status IN ('paid', 'free') THEN 1 END) as paid_orders,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders
        FROM orders
        WHERE created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP)`
      : `SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(CASE WHEN payment_status = 'free' THEN discount ELSE total END), 0) as total_revenue,
          COALESCE(SUM(discount), 0) as total_discounts,
          COUNT(CASE WHEN payment_status IN ('paid', 'free') THEN 1 END) as paid_orders,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders
        FROM orders
        WHERE DATE(created_at) = ?`,
    useSession ? [startTime, endTime] : [targetDate]
  );

  // Services summary
  const [servicesSummary] = await pool.query(
    useSession
      ? `SELECT 
          COUNT(*) as total_services,
          COALESCE(SUM(price), 0) as services_revenue,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_services,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_services
        FROM services
        WHERE created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP)`
      : `SELECT 
          COUNT(*) as total_services,
          COALESCE(SUM(price), 0) as services_revenue,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_services,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_services
        FROM services
        WHERE DATE(created_at) = ?`,
    useSession ? [startTime, endTime] : [targetDate]
  );

  const [paymentMethods] = await pool.query(
    useSession
      ? `SELECT 
          CASE 
            WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
            WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
            ELSE p.method 
          END as method,
          COUNT(*) as count,
          COALESCE(SUM(
            CASE 
              WHEN p.method = 'free' THEN o.discount
              ELSE p.amount 
            END
          ), 0) as total_amount
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP) AND p.status IN ('completed', 'pending') AND o.status != 'cancelled'
        GROUP BY 
          CASE 
            WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
            WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
            ELSE p.method 
          END`
      : `SELECT 
          CASE 
            WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
            WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
            ELSE p.method 
          END as method,
          COUNT(*) as count,
          COALESCE(SUM(
            CASE 
              WHEN p.method = 'free' THEN o.discount
              ELSE p.amount 
            END
          ), 0) as total_amount
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE DATE(o.created_at) = ? AND p.status IN ('completed', 'pending') AND o.status != 'cancelled'
        GROUP BY 
          CASE 
            WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
            WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
            ELSE p.method 
          END`,
    useSession ? [startTime, endTime] : [targetDate]
  );

  // Query all non-cancelled order items for the target date
  const [orderItems] = await pool.query(
    useSession
      ? `SELECT 
          oi.product_id,
          p.name as product_name,
          p.category,
          oi.quantity,
          oi.price,
          o.discount,
          o.total as order_total
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP) AND o.status != 'cancelled'`
      : `SELECT 
          oi.product_id,
          p.name as product_name,
          p.category,
          oi.quantity,
          oi.price,
          o.discount,
          o.total as order_total
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE DATE(o.created_at) = ? AND o.status != 'cancelled'`,
    useSession ? [startTime, endTime] : [targetDate]
  );

  // Query all non-cancelled, non-deleted services for the target date
  const [dayServices] = await pool.query(
    useSession
      ? `SELECT 
          s.service_name,
          s.vehicle_type,
          s.price as service_price,
          o.discount,
          o.total as order_total
        FROM services s
        JOIN orders o ON s.order_id = o.id
        WHERE s.created_at >= ? AND s.created_at <= COALESCE(?, CURRENT_TIMESTAMP) AND o.status != 'cancelled' AND s.is_deleted = 0`
      : `SELECT 
          s.service_name,
          s.vehicle_type,
          s.price as service_price,
          o.discount,
          o.total as order_total
        FROM services s
        JOIN orders o ON s.order_id = o.id
        WHERE DATE(s.created_at) = ? AND o.status != 'cancelled' AND s.is_deleted = 0`,
    useSession ? [startTime, endTime] : [targetDate]
  );

  // Group and calculate net revenues for Products
  const productMap = {};
  for (const item of orderItems) {
    if (item.category === 'Services' || item.category === 'VIP') continue;
    
    const qty = parseInt(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const itemSubtotal = qty * price;
    
    const discount = parseFloat(item.discount) || 0;
    const orderTotal = parseFloat(item.order_total) || 0;
    const orderSubtotal = orderTotal + discount;
    const netRevenue = orderSubtotal > 0 ? itemSubtotal * (1 - (discount / orderSubtotal)) : 0;
    
    const key = item.product_name;
    if (!productMap[key]) {
      productMap[key] = {
        name: item.product_name,
        category: item.category,
        quantity_sold: 0,
        revenue: 0
      };
    }
    productMap[key].quantity_sold += qty;
    productMap[key].revenue += netRevenue;
  }
  
  const topProductsList = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Group and calculate net revenues for Services (Saloon vs 4x4)
  const saloonServicesMap = {};
  const fourWheelServicesMap = {};
  
  for (const s of dayServices) {
    let cleanName = s.service_name.split(' (')[0].trim();
    const cleanNameLower = cleanName.toLowerCase();
    
    if (cleanNameLower.includes('full body service')) cleanName = 'Full Body Service';
    else if (cleanNameLower.includes('full body wash')) cleanName = 'Full Body Wash';
    else if (cleanNameLower.includes('ceramic wash')) cleanName = 'Ceramic Wash';
    else if (cleanNameLower.includes('double soap')) cleanName = 'Double Soap';
    else if (cleanNameLower.includes('body wash')) cleanName = 'Body Wash';
    else if (cleanNameLower.includes('just water')) cleanName = 'Just Water';
    else if (cleanNameLower.includes('saloon vip')) cleanName = 'Saloon VIP Service';
    else if (cleanNameLower.includes('4x4 vip')) cleanName = '4x4 VIP Service';
    
    const price = parseFloat(s.service_price) || 0;
    const discount = parseFloat(s.discount) || 0;
    const orderTotal = parseFloat(s.order_total) || 0;
    const orderSubtotal = orderTotal + discount;
    const netRevenue = orderSubtotal > 0 ? price * (1 - (discount / orderSubtotal)) : 0;
    
    const targetMap = s.vehicle_type === '4x4' ? fourWheelServicesMap : saloonServicesMap;
    
    if (!targetMap[cleanName]) {
      targetMap[cleanName] = {
        name: cleanName,
        category: s.vehicle_type === '4x4' ? '4x4 Service' : 'Saloon Service',
        quantity_sold: 0,
        revenue: 0
      };
    }
    targetMap[cleanName].quantity_sold += 1;
    targetMap[cleanName].revenue += netRevenue;
  }
  
  const topSaloonServicesList = Object.values(saloonServicesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
    
  const topFourWheelServicesList = Object.values(fourWheelServicesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Free washes breakdown query (Saloon vs 4x4)
  const [freeWashBreakdown] = await pool.query(
    useSession
      ? `SELECT 
          COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') as vehicle_type,
          COALESCE(SUM(o.discount), 0) as total_amount
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
        LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
        WHERE o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP) AND o.payment_status = 'free' AND o.status != 'cancelled'
        GROUP BY COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon')`
      : `SELECT 
          COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') as vehicle_type,
          COALESCE(SUM(o.discount), 0) as total_amount
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
        LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
        WHERE DATE(o.created_at) = ? AND o.payment_status = 'free' AND o.status != 'cancelled'
        GROUP BY COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon')`,
    useSession ? [startTime, endTime] : [targetDate]
  );

  const saloonFreeAmount = freeWashBreakdown.find(f => f.vehicle_type === 'Saloon')?.total_amount || 0;
  const fourWheelFreeAmount = freeWashBreakdown.find(f => f.vehicle_type === '4x4')?.total_amount || 0;

  // Get sum of order totals (excluding cancelled ones) for that date (net sales = subtotal - discount)
  const [ordersTotalSum] = await pool.query(
    useSession
      ? `SELECT COALESCE(SUM(total), 0) as total_net_sales
        FROM orders
        WHERE created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP) AND status != 'cancelled'`
      : `SELECT COALESCE(SUM(total), 0) as total_net_sales
        FROM orders
        WHERE DATE(created_at) = ? AND status != 'cancelled'`,
    useSession ? [startTime, endTime] : [targetDate]
  );
  const totalSales = parseFloat(ordersTotalSum[0].total_net_sales || 0);

  if (ordersSummary[0]) {
    ordersSummary[0].total_sales = totalSales;
    ordersSummary[0].saloon_free_washes_value = parseFloat(saloonFreeAmount);
    ordersSummary[0].four_wheel_free_washes_value = parseFloat(fourWheelFreeAmount);
  }

  const reportData = {
    date: targetDate,
    orders: ordersSummary[0] || {},
    services: servicesSummary[0] || {},
    payment_methods: paymentMethods || [],
    top_products: topProductsList || [],
    top_services_saloon: topSaloonServicesList || [],
    top_services_4x4: topFourWheelServicesList || []
  };

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Daily Business Summary', targetDate],
      [''],
      ['Orders Summary'],
      ['Total Orders', reportData.orders.total_orders || 0],
      ['Total Sales', reportData.orders.total_sales || 0],
      ['Total Discounts', reportData.orders.total_discounts || 0],
      ['Paid Orders', reportData.orders.paid_orders || 0],
      ['Pending Orders', reportData.orders.pending_orders || 0],
      ['Saloon Free Washes Value', reportData.orders.saloon_free_washes_value || 0],
      ['4x4 Free Washes Value', reportData.orders.four_wheel_free_washes_value || 0],
      [''],
      ['Services Summary'],
      ['Total Services', reportData.services.total_services || 0],
      ['Services Sales', reportData.services.services_revenue || 0],
      ['Completed Services', reportData.services.completed_services || 0],
      ['In Progress Services', reportData.services.in_progress_services || 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Payment Methods sheet
    if (paymentMethods.length > 0) {
      const paymentData = [
        ['Method', 'Count', 'Total Amount'],
        ...paymentMethods.map(pm => [pm.method, pm.count, pm.total_amount])
      ];
      const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payment Methods');
    }

    // Top Products sheet
    if (topProducts.length > 0) {
      const productsData = [
        ['Product Name', 'Category', 'Quantity Sold', 'Revenue'],
        ...topProducts.map(p => [p.name, p.category, p.quantity_sold, p.revenue])
      ];
      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');
    }

    sendExcelFile(res, workbook, `daily-summary-${targetDate}.xlsx`);
    return;
  }

  res.json(reportData);
});

// @desc    Get monthly summary report
// @route   GET /api/analytics/reports/monthly-summary
// @access  Private
const getMonthlySummary = asyncHandler(async (req, res) => {
  const { year, month, format = 'json' } = req.query;
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;

  // Monthly orders summary
  const [monthlyOrders] = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as orders_count,
      COALESCE(SUM(CASE WHEN payment_status = 'free' THEN discount ELSE total END), 0) as daily_revenue,
      COUNT(CASE WHEN payment_status IN ('paid', 'free') THEN 1 END) as paid_orders
    FROM orders
    WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [targetYear, targetMonth]);

  // Monthly services summary
  const [monthlyServices] = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as services_count,
      COALESCE(SUM(price), 0) as daily_revenue,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
    FROM services
    WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [targetYear, targetMonth]);

  // Monthly totals
  const [monthlyTotals] = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN o.payment_status = 'free' THEN o.discount ELSE o.total END), 0) as total_revenue,
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(s.price), 0) as total_services_revenue,
      COUNT(DISTINCT s.id) as total_services,
      COUNT(DISTINCT o.customer_id) as unique_customers
    FROM orders o
    LEFT JOIN services s ON DATE(s.created_at) = DATE(o.created_at)
    WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ? AND o.payment_status IN ('paid', 'free')
  `, [targetYear, targetMonth]);

  const reportData = {
    year: targetYear,
    month: targetMonth,
    daily_orders: monthlyOrders || [],
    daily_services: monthlyServices || [],
    totals: monthlyTotals[0] || {}
  };

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Monthly Summary Report', `${targetMonth}/${targetYear}`],
      [''],
      ['Monthly Totals'],
      ['Total Revenue', reportData.totals.total_revenue || 0],
      ['Total Orders', reportData.totals.total_orders || 0],
      ['Services Revenue', reportData.totals.total_services_revenue || 0],
      ['Total Services', reportData.totals.total_services || 0],
      ['Unique Customers', reportData.totals.unique_customers || 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Daily Orders sheet
    if (monthlyOrders.length > 0) {
      const ordersData = [
        ['Date', 'Orders Count', 'Daily Revenue', 'Paid Orders'],
        ...monthlyOrders.map(day => [day.date, day.orders_count, day.daily_revenue, day.paid_orders])
      ];
      const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Daily Orders');
    }

    // Daily Services sheet
    if (monthlyServices.length > 0) {
      const servicesData = [
        ['Date', 'Services Count', 'Daily Revenue', 'Completed'],
        ...monthlyServices.map(day => [day.date, day.services_count, day.daily_revenue, day.completed_count])
      ];
      const servicesSheet = XLSX.utils.aoa_to_sheet(servicesData);
      XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Daily Services');
    }

    sendExcelFile(res, workbook, `monthly-summary-${targetYear}-${targetMonth}.xlsx`);
    return;
  }

  res.json(reportData);
});

// @desc    Get payment type report
// @route   GET /api/analytics/reports/payment-types
// @access  Private
const getPaymentTypeReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, format = 'json' } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date && end_date) {
    const [sessions] = await pool.query(
      "SELECT DATE_FORMAT(opened_at, '%Y-%m-%d %H:%i:%s') as opened_at, DATE_FORMAT(closed_at, '%Y-%m-%d %H:%i:%s') as closed_at FROM cash_registers WHERE DATE(opened_at) BETWEEN ? AND ? ORDER BY opened_at ASC",
      [start_date, end_date]
    );
    if (sessions.length > 0) {
      const startTime = sessions[0].opened_at;
      const endTime = sessions[sessions.length - 1].closed_at;
      dateFilter = 'AND p.created_at >= ? AND p.created_at <= COALESCE(?, CURRENT_TIMESTAMP)';
      params.push(startTime, endTime);
    } else {
      dateFilter = 'AND DATE(p.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
  }

  // Payment breakdown by method
  const [paymentBreakdown] = await pool.query(`
    SELECT 
      CASE 
        WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
        WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
        WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = 'Saloon' THEN 'saloon_free'
        WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = '4x4' THEN '4x4_free'
        ELSE p.method 
      END as method,
      COUNT(*) as transaction_count,
      COALESCE(SUM(
        CASE 
          WHEN p.method = 'free' THEN o.discount 
          ELSE p.amount 
        END
      ), 0) as total_amount,
      COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
      COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
    LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
    WHERE 1=1 ${dateFilter} AND o.status != 'cancelled' AND p.status IN ('completed', 'pending')
    GROUP BY 
      CASE 
        WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
        WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
        WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = 'Saloon' THEN 'saloon_free'
        WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = '4x4' THEN '4x4_free'
        ELSE p.method 
      END
    ORDER BY total_amount DESC
  `, params);

  // Payment status summary
  const [statusSummary] = await pool.query(`
    SELECT 
      p.status,
      COUNT(*) as count,
      COALESCE(SUM(
        CASE 
          WHEN p.method = 'free' THEN o.discount 
          ELSE p.amount 
        END
      ), 0) as total_amount
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE 1=1 ${dateFilter} AND o.status != 'cancelled' AND p.status IN ('completed', 'pending')
    GROUP BY p.status
  `, params);

  const reportData = {
    period: { start_date: start_date || null, end_date: end_date || null },
    payment_methods: paymentBreakdown || [],
    status_summary: statusSummary || []
  };

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    
    // Payment Methods sheet
    if (paymentBreakdown.length > 0) {
      const paymentData = [
        ['Method', 'Transactions', 'Completed', 'Pending', 'Failed', 'Total Amount'],
        ...paymentBreakdown.map(pm => [
          pm.method,
          pm.transaction_count,
          pm.completed_count,
          pm.pending_count,
          pm.failed_count,
          pm.total_amount
        ])
      ];
      const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payment Methods');
    }

    // Status Summary sheet
    if (statusSummary.length > 0) {
      const statusData = [
        ['Status', 'Count', 'Total Amount'],
        ...statusSummary.map(s => [s.status, s.count, s.total_amount])
      ];
      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Summary');
    }

    const filename = `payment-types-${start_date || 'all'}-${end_date || 'all'}.xlsx`;
    sendExcelFile(res, workbook, filename);
    return;
  }

  res.json(reportData);
});

// @desc    Get customer wise report
// @route   GET /api/analytics/reports/customer-wise
// @access  Private
const getCustomerWiseReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, format = 'json' } = req.query;

  let orderDateFilter = '';
  let serviceDateFilter = '';
  const params = [];

  if (start_date && end_date) {
    orderDateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
    serviceDateFilter = 'AND DATE(s.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date, start_date, end_date);
  }

  // Customer summary
  const [customerReport] = await pool.query(`
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.vehicle_plate,
      c.vehicle_type,
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(o.total), 0) as total_spent,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as paid_amount,
      COALESCE(SUM(CASE WHEN o.payment_status = 'pending' THEN o.total ELSE 0 END), 0) as pending_amount,
      COUNT(DISTINCT s.id) as total_services,
      COALESCE(SUM(s.price), 0) as services_spent,
      MAX(o.created_at) as last_order_date
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id ${orderDateFilter}
    LEFT JOIN services s ON c.id = s.customer_id ${serviceDateFilter}
    GROUP BY c.id
    HAVING total_orders > 0 OR total_services > 0
    ORDER BY total_spent DESC
  `, params);

  const reportData = {
    period: { start_date: start_date || null, end_date: end_date || null },
    customers: customerReport || []
  };

  if (format === 'excel' && customerReport.length > 0) {
    const workbook = XLSX.utils.book_new();
    
    const customerData = [
      ['ID', 'Name', 'Phone', 'Vehicle Plate', 'Vehicle Type', 'Total Orders', 'Total Services', 'Total Spent', 'Services Spent', 'Paid Amount', 'Pending Amount', 'Last Order Date'],
      ...customerReport.map(c => [
        c.id,
        c.name,
        c.phone || 'N/A',
        c.vehicle_plate,
        c.vehicle_type,
        c.total_orders,
        c.total_services,
        c.total_spent,
        c.services_spent,
        c.paid_amount,
        c.pending_amount,
        c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : 'N/A'
      ])
    ];
    const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customers');

    const filename = `customer-wise-${start_date || 'all'}-${end_date || 'all'}.xlsx`;
    sendExcelFile(res, workbook, filename);
    return;
  }

  res.json(reportData);
});

// @desc    Get supplier payment report
// @route   GET /api/analytics/reports/supplier-payments
// @access  Private
const getSupplierPaymentReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, format = 'json' } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date && end_date) {
    dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  // Supplier payment summary based on products sold
  const [supplierPayments] = await pool.query(`
    SELECT 
      s.id as supplier_id,
      s.name as supplier_name,
      s.contact_person,
      s.phone,
      s.email,
      COUNT(DISTINCT p.id) as products_count,
      COUNT(DISTINCT oi.order_id) as orders_involved,
      SUM(oi.quantity) as items_sold,
      COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue_from_products
    FROM suppliers s
    LEFT JOIN products p ON s.id = p.supplier_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid' ${dateFilter}
    WHERE s.id IS NOT NULL
    GROUP BY s.id
    HAVING products_count > 0
    ORDER BY total_revenue_from_products DESC
  `, params);

  const reportData = {
    period: { start_date: start_date || null, end_date: end_date || null },
    suppliers: supplierPayments || []
  };

  if (format === 'excel' && supplierPayments.length > 0) {
    const workbook = XLSX.utils.book_new();
    
    const supplierData = [
      ['Supplier ID', 'Supplier Name', 'Contact Person', 'Phone', 'Email', 'Products Count', 'Orders Involved', 'Items Sold', 'Revenue'],
      ...supplierPayments.map(s => [
        s.supplier_id,
        s.supplier_name,
        s.contact_person || 'N/A',
        s.phone || 'N/A',
        s.email || 'N/A',
        s.products_count,
        s.orders_involved,
        s.items_sold || 0,
        s.total_revenue_from_products
      ])
    ];
    const supplierSheet = XLSX.utils.aoa_to_sheet(supplierData);
    XLSX.utils.book_append_sheet(workbook, supplierSheet, 'Suppliers');

    const filename = `supplier-payments-${start_date || 'all'}-${end_date || 'all'}.xlsx`;
    sendExcelFile(res, workbook, filename);
    return;
  }

  res.json(reportData);
});

// @desc    Get purchase of items report
// @route   GET /api/analytics/reports/purchases
// @access  Private
const getPurchasesReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, format = 'json' } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date && end_date) {
    dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  // Items purchased/sold
  const [purchases] = await pool.query(`
    SELECT 
      p.id,
      p.name,
      p.category,
      p.supplier_id,
      s.name as supplier_name,
      SUM(oi.quantity) as quantity_sold,
      COUNT(DISTINCT oi.order_id) as order_count,
      COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
      AVG(oi.price) as average_price,
      MIN(oi.price) as min_price,
      MAX(oi.price) as max_price
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.payment_status = 'paid' ${dateFilter}
    GROUP BY p.id
    ORDER BY total_revenue DESC
  `, params);

  // Category summary
  const [categorySummary] = await pool.query(`
    SELECT 
      p.category,
      COUNT(DISTINCT p.id) as product_count,
      SUM(oi.quantity) as total_quantity_sold,
      COALESCE(SUM(oi.quantity * oi.price), 0) as category_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.payment_status = 'paid' ${dateFilter}
    GROUP BY p.category
    ORDER BY category_revenue DESC
  `, params);

  const reportData = {
    period: { start_date: start_date || null, end_date: end_date || null },
    items: purchases || [],
    category_summary: categorySummary || []
  };

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    
    // Category Summary sheet
    if (categorySummary.length > 0) {
      const categoryData = [
        ['Category', 'Product Count', 'Total Quantity Sold', 'Category Revenue'],
        ...categorySummary.map(cat => [
          cat.category,
          cat.product_count,
          cat.total_quantity_sold,
          cat.category_revenue
        ])
      ];
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Summary');
    }

    // Items sheet
    if (purchases.length > 0) {
      const itemsData = [
        ['Product ID', 'Product Name', 'Category', 'Supplier', 'Quantity Sold', 'Order Count', 'Average Price', 'Min Price', 'Max Price', 'Total Revenue'],
        ...purchases.map(item => [
          item.id,
          item.name,
          item.category,
          item.supplier_name || 'N/A',
          item.quantity_sold,
          item.order_count,
          item.average_price,
          item.min_price,
          item.max_price,
          item.total_revenue
        ])
      ];
      const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Purchases');
    }

    const filename = `purchases-${start_date || 'all'}-${end_date || 'all'}.xlsx`;
    sendExcelFile(res, workbook, filename);
    return;
  }

  res.json(reportData);
});

// @desc    Get Profit & Loss statement report
// @route   GET /api/analytics/reports/profit-loss
// @access  Private (Admin)
const getProfitLossReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ success: false, message: 'Start date and end date are required' });
  }

  // Find sessions in the range
  const [sessions] = await pool.query(
    "SELECT DATE_FORMAT(opened_at, '%Y-%m-%d %H:%i:%s') as opened_at, DATE_FORMAT(closed_at, '%Y-%m-%d %H:%i:%s') as closed_at FROM cash_registers WHERE DATE(opened_at) BETWEEN ? AND ? ORDER BY opened_at ASC",
    [start_date, end_date]
  );
  
  let useSession = false;
  let startTime, endTime;
  if (sessions.length > 0) {
    useSession = true;
    startTime = sessions[0].opened_at;
    endTime = sessions[sessions.length - 1].closed_at;
  }

  // 1. Query Cash Sales
  const [cashSalesResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method = 'cash' AND p.status IN ('completed', 'pending') AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method = 'cash' AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );
  
  // 2. Query Card Sales
  const [cardSalesResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') AND p.status IN ('completed', 'pending') AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // Query Tap Sales
  const [tapSalesResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method IN ('tap', 'apple_pay', 'samsung_pay', 'tap_payments') AND p.status IN ('completed', 'pending') AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method IN ('tap', 'apple_pay', 'samsung_pay', 'tap_payments') AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // 3. Query Bank Transfer Sales
  const [bankSalesResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method = 'bank_transfer' AND p.status IN ('completed', 'pending') AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method = 'bank_transfer' AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // 4. Query Credit Sales
  const [creditSalesResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(cc.amount), 0) as total FROM customer_credits cc JOIN orders o ON cc.order_id = o.id WHERE o.status != 'cancelled' AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(cc.amount), 0) as total FROM customer_credits cc JOIN orders o ON cc.order_id = o.id WHERE o.status != 'cancelled' AND DATE(o.created_at) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // 5. Query Discounts and Count
  const [discountsResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(discount), 0) as total_discounts, COUNT(*) as sales_count FROM orders WHERE status != 'cancelled' AND created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(discount), 0) as total_discounts, COUNT(*) as sales_count FROM orders WHERE status != 'cancelled' AND DATE(created_at) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // Query Free Washes breakdown (Saloon vs 4x4)
  const [freeWashBreakdown] = await pool.query(
    useSession
      ? `SELECT 
          COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') as vehicle_type,
          COALESCE(SUM(o.discount), 0) as total_amount,
          COUNT(o.id) as washes_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
        LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
        WHERE o.status != 'cancelled' AND o.payment_status = 'free' AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)
        GROUP BY COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon')`
      : `SELECT 
          COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') as vehicle_type,
          COALESCE(SUM(o.discount), 0) as total_amount,
          COUNT(o.id) as washes_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
        LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
        WHERE o.status != 'cancelled' AND o.payment_status = 'free' AND DATE(o.created_at) BETWEEN ? AND ?
        GROUP BY COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon')`,
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  const saloonFreeAmount = freeWashBreakdown.find(f => f.vehicle_type === 'Saloon')?.total_amount || 0;
  const saloonFreeCount = freeWashBreakdown.find(f => f.vehicle_type === 'Saloon')?.washes_count || 0;
  const fourWheelFreeAmount = freeWashBreakdown.find(f => f.vehicle_type === '4x4')?.total_amount || 0;
  const fourWheelFreeCount = freeWashBreakdown.find(f => f.vehicle_type === '4x4')?.washes_count || 0;
  
  const freeWashTotal = parseFloat(saloonFreeAmount) + parseFloat(fourWheelFreeAmount);
  const freeWashCount = parseInt(saloonFreeCount) + parseInt(fourWheelFreeCount);

  const cashSales = parseFloat(cashSalesResult[0].total || 0);
  const cardSales = parseFloat(cardSalesResult[0].total || 0);
  const tapSales = parseFloat(tapSalesResult[0].total || 0);
  const bankSales = parseFloat(bankSalesResult[0].total || 0);
  const creditSales = parseFloat(creditSalesResult[0].total || 0);
  const totalDiscounts = parseFloat(discountsResult[0].total_discounts || 0);
  const salesCount = discountsResult[0].sales_count || 0;

  const netSales = cashSales + cardSales + tapSales + bankSales + creditSales + freeWashTotal;
  const totalSales = netSales + totalDiscounts - freeWashTotal;

  // 6. Query Cost of Order Items (for orders with items)
  const [itemsCostResult] = await pool.query(
    useSession
      ? `SELECT COALESCE(SUM(oi.quantity * COALESCE(p.purchase_price, 0)), 0) as total
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'cancelled' AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)`
      : `SELECT COALESCE(SUM(oi.quantity * COALESCE(p.purchase_price, 0)), 0) as total
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'cancelled' AND DATE(o.created_at) BETWEEN ? AND ?`,
    useSession ? [startTime, endTime] : [start_date, end_date]
  );
  const itemsCost = parseFloat(itemsCostResult[0].total || 0);

  // 7. Query Cost of Services (for website bookings without order items)
  const [servicesCostResult] = await pool.query(
    useSession
      ? `SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0)), 0) as total
         FROM services s
         JOIN orders o ON s.order_id = o.id
         JOIN products p ON s.service_name = p.name
         WHERE o.status != 'cancelled' 
           AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
           AND o.created_at >= ? AND o.created_at <= COALESCE(?, CURRENT_TIMESTAMP)`
      : `SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0)), 0) as total
         FROM services s
         JOIN orders o ON s.order_id = o.id
         JOIN products p ON s.service_name = p.name
         WHERE o.status != 'cancelled' 
           AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
           AND DATE(o.created_at) BETWEEN ? AND ?`,
    useSession ? [startTime, endTime] : [start_date, end_date]
  );
  const servicesCost = parseFloat(servicesCostResult[0].total || 0);

  const totalCost = itemsCost + servicesCost;

  // 8. Get total purchases
  const [purchasesResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(total_price), 0) as total_purchases, COUNT(*) as purchases_count FROM purchases WHERE created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(total_price), 0) as total_purchases, COUNT(*) as purchases_count FROM purchases WHERE DATE(purchase_date) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // 9. Get total expenses
  const [expensesResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expenses_count FROM expenses WHERE created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expenses_count FROM expenses WHERE DATE(expense_date) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // 10. Get purchases by category
  const [purchasesByCategory] = await pool.query(
    useSession
      ? "SELECT category, COALESCE(SUM(total_price), 0) as total, COUNT(*) as count FROM purchases WHERE created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP) GROUP BY category"
      : "SELECT category, COALESCE(SUM(total_price), 0) as total, COUNT(*) as count FROM purchases WHERE DATE(purchase_date) BETWEEN ? AND ? GROUP BY category",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // 11. Get expenses by category
  const [expensesByCategory] = await pool.query(
    useSession
      ? "SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE created_at >= ? AND created_at <= COALESCE(?, CURRENT_TIMESTAMP) GROUP BY category"
      : "SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE DATE(expense_date) BETWEEN ? AND ? GROUP BY category",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // 12. Get credits outstanding summary
  const [creditsResult] = await pool.query(
    "SELECT COALESCE(SUM(remaining_amount), 0) as total_outstanding, COUNT(*) as count FROM customer_credits WHERE status != 'fully_paid'"
  );

  // Query Cash Recovery
  const [cashRecoveryResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'cash' AND payment_date >= ? AND payment_date <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'cash' AND DATE(payment_date) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // Query Card Recovery
  const [cardRecoveryResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'card' AND payment_date >= ? AND payment_date <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'card' AND DATE(payment_date) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  // Query Bank Transfer Recovery
  const [bankRecoveryResult] = await pool.query(
    useSession
      ? "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'bank_transfer' AND payment_date >= ? AND payment_date <= COALESCE(?, CURRENT_TIMESTAMP)"
      : "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'bank_transfer' AND DATE(payment_date) BETWEEN ? AND ?",
    useSession ? [startTime, endTime] : [start_date, end_date]
  );

  const totalPurchases = parseFloat(purchasesResult[0].total_purchases || 0);
  const totalExpenses = parseFloat(expensesResult[0].total_expenses || 0);
  const netProfit = netSales - totalCost;

  res.json({
    success: true,
    period: { start_date, end_date },
    summary: {
      total_sales: totalSales,
      net_sales: netSales,
      total_discounts: totalDiscounts,
      sales_count: salesCount,
      total_purchases: totalPurchases,
      purchases_count: purchasesResult[0].purchases_count,
      total_expenses: totalExpenses,
      expenses_count: expensesResult[0].expenses_count,
      total_cost: totalCost,
      net_profit: netProfit,
      outstanding_credit: parseFloat(creditsResult[0].total_outstanding || 0),
      outstanding_credit_count: creditsResult[0].count,
      cash_sales: cashSales,
      card_sales: cardSales,
      tap_sales: tapSales,
      bank_transfer_sales: bankSales,
      credit_sales: creditSales,
      cash_recovery: parseFloat(cashRecoveryResult[0].total || 0),
      card_recovery: parseFloat(cardRecoveryResult[0].total || 0),
      bank_recovery: parseFloat(bankRecoveryResult[0].total || 0),
      free_wash_total: freeWashTotal,
      free_wash_count: freeWashCount,
      saloon_free_wash_total: saloonFreeAmount,
      saloon_free_wash_count: saloonFreeCount,
      fourx4_free_wash_total: fourWheelFreeAmount,
      fourx4_free_wash_count: fourWheelFreeCount
    },
    purchases_by_category: purchasesByCategory || [],
    expenses_by_category: expensesByCategory || []
  });
});

// @desc    Generate report PDF for WhatsApp sharing
// @route   GET /api/analytics/reports/pdf
// @access  Private
const getReportPDF = asyncHandler(async (req, res) => {
  const { tab, date, start_date, end_date, register_id } = req.query;

  if (!tab) {
    return res.status(400).json({ success: false, message: 'Tab type is required' });
  }

  let reportData = null;
  const params = { date, start_date, end_date, register_id };

  // Fetch report data based on the tab
  if (tab === 'daily') {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const [ordersSummary] = await pool.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue, COALESCE(SUM(discount), 0) as total_discounts,
       COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders, COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders FROM orders WHERE DATE(created_at) = ?`,
      [targetDate]
    );
    const [servicesSummary] = await pool.query(
      `SELECT COUNT(*) as total_services, COALESCE(SUM(price), 0) as services_revenue,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_services FROM services WHERE DATE(created_at) = ?`,
      [targetDate]
    );
    const [paymentMethods] = await pool.query(
      `SELECT 
        CASE 
          WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
          WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
          ELSE p.method 
        END as method, 
        COUNT(*) as count, 
        COALESCE(SUM(
          CASE 
            WHEN p.method = 'free' THEN o.discount
            ELSE p.amount 
          END
        ), 0) as total_amount 
       FROM payments p JOIN orders o ON p.order_id = o.id 
       WHERE DATE(o.created_at) = ? AND p.status = 'completed' 
       GROUP BY 
        CASE 
          WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
          WHEN p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') THEN 'card'
          ELSE p.method 
        END`,
      [targetDate]
    );
    const [topProducts] = await pool.query(
      `SELECT p.name, p.category, SUM(oi.quantity) as quantity_sold, SUM(oi.quantity * oi.price) as revenue FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id WHERE DATE(o.created_at) = ? AND o.payment_status = 'paid' GROUP BY p.id ORDER BY revenue DESC LIMIT 10`,
      [targetDate]
    );
    reportData = {
      orders: ordersSummary[0] || {},
      services: servicesSummary[0] || {},
      payment_methods: paymentMethods || [],
      top_products: topProducts || []
    };
  } else if (tab === 'business_summary') {
    const [cashSalesResult] = await pool.query(
      "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method = 'cash' AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [cardSalesResult] = await pool.query(
      "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method IN ('card', 'visa', 'mastercard', 'master_card', 'master') AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [tapSalesResult] = await pool.query(
      "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method IN ('tap', 'apple_pay', 'samsung_pay', 'tap_payments') AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [bankSalesResult] = await pool.query(
      "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.status != 'cancelled' AND p.method = 'bank_transfer' AND p.status IN ('completed', 'pending') AND DATE(o.created_at) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [creditSalesResult] = await pool.query(
      "SELECT COALESCE(SUM(cc.amount), 0) as total FROM customer_credits cc JOIN orders o ON cc.order_id = o.id WHERE o.status != 'cancelled' AND DATE(o.created_at) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [discountsResult] = await pool.query(
      "SELECT COALESCE(SUM(discount), 0) as total_discounts, COUNT(*) as sales_count FROM orders WHERE status != 'cancelled' AND DATE(created_at) BETWEEN ? AND ?",
      [start_date, end_date]
    );

    // Query Free Washes breakdown (Saloon vs 4x4)
    const [freeWashBreakdown] = await pool.query(`
      SELECT 
        COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') as vehicle_type,
        COALESCE(SUM(o.discount), 0) as total_amount,
        COUNT(o.id) as washes_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
      LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
      WHERE o.status != 'cancelled' AND o.payment_status = 'free' AND DATE(o.created_at) BETWEEN ? AND ?
      GROUP BY COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon')
    `, [start_date, end_date]);

    const saloonFreeAmount = freeWashBreakdown.find(f => f.vehicle_type === 'Saloon')?.total_amount || 0;
    const saloonFreeCount = freeWashBreakdown.find(f => f.vehicle_type === 'Saloon')?.washes_count || 0;
    const fourWheelFreeAmount = freeWashBreakdown.find(f => f.vehicle_type === '4x4')?.total_amount || 0;
    const fourWheelFreeCount = freeWashBreakdown.find(f => f.vehicle_type === '4x4')?.washes_count || 0;
    
    const freeWashTotal = parseFloat(saloonFreeAmount) + parseFloat(fourWheelFreeAmount);
    const freeWashCount = parseInt(saloonFreeCount) + parseInt(fourWheelFreeCount);

    const cashSales = parseFloat(cashSalesResult[0].total || 0);
    const cardSales = parseFloat(cardSalesResult[0].total || 0);
    const tapSales = parseFloat(tapSalesResult[0].total || 0);
    const bankSales = parseFloat(bankSalesResult[0].total || 0);
    const creditSales = parseFloat(creditSalesResult[0].total || 0);
    const totalDiscounts = parseFloat(discountsResult[0].total_discounts || 0);
    const salesCount = discountsResult[0].sales_count || 0;
    const netSales = cashSales + cardSales + tapSales + bankSales + creditSales + freeWashTotal;
    const totalSales = netSales + totalDiscounts - freeWashTotal;

    const [itemsCostResult] = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity * COALESCE(p.purchase_price, 0)), 0) as total FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled' AND DATE(o.created_at) BETWEEN ? AND ?`,
      [start_date, end_date]
    );
    const itemsCost = parseFloat(itemsCostResult[0].total || 0);

    const [servicesCostResult] = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0)), 0) as total FROM services s JOIN orders o ON s.order_id = o.id JOIN products p ON s.service_name = p.name WHERE o.status != 'cancelled' AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id) AND DATE(o.created_at) BETWEEN ? AND ?`,
      [start_date, end_date]
    );
    const servicesCost = parseFloat(servicesCostResult[0].total || 0);
    const totalCost = itemsCost + servicesCost;

    const [purchasesResult] = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0) as total_purchases, COUNT(*) as purchases_count FROM purchases WHERE DATE(purchase_date) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [expensesResult] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expenses_count FROM expenses WHERE DATE(expense_date) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [purchasesByCategory] = await pool.query(
      "SELECT category, COALESCE(SUM(total_price), 0) as total, COUNT(*) as count FROM purchases WHERE DATE(purchase_date) BETWEEN ? AND ? GROUP BY category",
      [start_date, end_date]
    );
    const [expensesByCategory] = await pool.query(
      "SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE DATE(expense_date) BETWEEN ? AND ? GROUP BY category",
      [start_date, end_date]
    );

    const [cashRecoveryResult] = await pool.query(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'cash' AND DATE(payment_date) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [cardRecoveryResult] = await pool.query(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'card' AND DATE(payment_date) BETWEEN ? AND ?",
      [start_date, end_date]
    );
    const [bankRecoveryResult] = await pool.query(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_method = 'bank_transfer' AND DATE(payment_date) BETWEEN ? AND ?",
      [start_date, end_date]
    );

    reportData = {
      summary: {
        total_sales: totalSales,
        net_sales: netSales,
        total_discounts: totalDiscounts,
        sales_count: salesCount,
        total_purchases: parseFloat(purchasesResult[0].total_purchases || 0),
        purchases_count: purchasesResult[0].purchases_count,
        total_expenses: parseFloat(expensesResult[0].total_expenses || 0),
        expenses_count: expensesResult[0].expenses_count,
        total_cost: totalCost,
        net_profit: netSales - totalCost,
        cash_sales: cashSales,
        card_sales: cardSales,
        tap_sales: tapSales,
        bank_transfer_sales: bankSales,
        credit_sales: creditSales,
        cash_recovery: parseFloat(cashRecoveryResult[0].total || 0),
        card_recovery: parseFloat(cardRecoveryResult[0].total || 0),
        bank_recovery: parseFloat(bankRecoveryResult[0].total || 0),
        free_wash_total: freeWashTotal,
        free_wash_count: freeWashCount,
        saloon_free_wash_total: saloonFreeAmount,
        saloon_free_wash_count: saloonFreeCount,
        fourx4_free_wash_total: fourWheelFreeAmount,
        fourx4_free_wash_count: fourWheelFreeCount
      },
      purchases_by_category: purchasesByCategory || [],
      expenses_by_category: expensesByCategory || []
    };
  } else if (tab === 'stock') {
    const paramsList = [];
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      paramsList.push(start_date, end_date);
    }
    const [stockData] = await pool.query(
      `SELECT p.id, p.name, p.category, p.stock AS current_stock, p.price AS selling_price, p.purchase_price AS cost_price,
       COALESCE(SUM(CASE WHEN o.payment_status = 'paid' ${dateFilter} THEN oi.quantity ELSE 0 END), 0) AS quantity_sold
       FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id LEFT JOIN orders o ON oi.order_id = o.id
       WHERE p.category != 'Services' GROUP BY p.id ORDER BY p.name ASC`,
      paramsList
    );
    reportData = stockData;
  } else if (tab === 'payment') {
    const [paymentMethods] = await pool.query(
      `SELECT 
        CASE 
          WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
          WHEN p.method IN ('mastercard', 'master_card', 'master') THEN 'card'
          WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = 'Saloon' THEN 'saloon_free'
          WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = '4x4' THEN '4x4_free'
          ELSE p.method 
        END as method,
        COUNT(*) as transaction_count, 
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count, 
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count,
        COALESCE(SUM(
          CASE 
            WHEN p.status = 'completed' AND p.method = 'free' THEN o.discount
            WHEN p.status = 'completed' THEN p.amount 
            ELSE 0 
          END
        ), 0) as total_amount
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN vip_bookings vb ON o.vip_booking_id = vb.id
       LEFT JOIN vip_customers vc ON vb.vip_customer_id = vc.id
       WHERE DATE(o.created_at) BETWEEN ? AND ? 
       GROUP BY 
        CASE 
          WHEN p.method IN ('apple_pay', 'samsung_pay', 'tap_payments', 'tap') THEN 'tap'
          WHEN p.method IN ('mastercard', 'master_card', 'master') THEN 'card'
          WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = 'Saloon' THEN 'saloon_free'
          WHEN p.method = 'free' AND COALESCE(c.vehicle_type, vc.vehicle_type, 'Saloon') = '4x4' THEN '4x4_free'
          ELSE p.method 
        END`,
      [start_date, end_date]
    );
    reportData = { payment_methods: paymentMethods || [] };
  } else if (tab === 'customer') {
    const [customersData] = await pool.query(
      `SELECT c.id, c.name, c.phone, c.vehicle_plate, COUNT(o.id) as total_orders,
       COALESCE(SUM(o.total), 0) as total_spent, COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as paid_amount,
       COALESCE(SUM(CASE WHEN o.payment_status = 'pending' THEN o.total ELSE 0 END), 0) as pending_amount
       FROM customers c LEFT JOIN orders o ON c.id = o.customer_id AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY c.id ORDER BY total_spent DESC`,
      [start_date, end_date]
    );
    reportData = { customers: customersData || [] };
  } else if (tab === 'supplier') {
    const [suppliersData] = await pool.query(
      `SELECT s.id as supplier_id, s.name as supplier_name, s.contact_person, s.phone, COUNT(DISTINCT p.id) as products_count,
       COUNT(DISTINCT oi.order_id) as orders_involved, COALESCE(SUM(oi.quantity), 0) as items_sold,
       COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue_from_products
       FROM suppliers s LEFT JOIN products p ON s.id = p.supplier_id LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY s.id ORDER BY supplier_name ASC`,
      [start_date, end_date]
    );
    reportData = { suppliers: suppliersData || [] };
  } else if (tab === 'purchases') {
    const [purchasesData] = await pool.query(
      `SELECT p.name as product_name, p.category, COALESCE(SUM(oi.quantity), 0) as quantity_sold,
       COALESCE(SUM(oi.quantity * oi.price), 0) as total_amount, COUNT(DISTINCT oi.order_id) as order_count,
       COALESCE(AVG(oi.price), 0) as average_price
       FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id
       WHERE DATE(o.created_at) BETWEEN ? AND ? GROUP BY p.id ORDER BY total_amount DESC`,
      [start_date, end_date]
    );
    reportData = { items: purchasesData || [] };
  } else if (tab === 'credit') {
    const [credits] = await pool.query(
      `SELECT cc.*, c.name as customer_name, c.phone as customer_phone, c.vehicle_plate, c.vehicle_type
       FROM customer_credits cc 
       JOIN customers c ON cc.customer_id = c.id 
       JOIN orders o ON cc.order_id = o.id
       WHERE o.status != 'cancelled'
       ORDER BY cc.status ASC, cc.created_at DESC`
    );
    let filtered = credits;
    if (start_date && end_date) {
      const start = new Date(start_date + 'T00:00:00');
      const end = new Date(end_date + 'T23:59:59');
      filtered = credits.filter(c => {
        const date = new Date(c.created_at);
        return date >= start && date <= end;
      });
    }
    const total_credit_granted = filtered.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    const total_outstanding = filtered.reduce((sum, c) => sum + parseFloat(c.remaining_amount || 0), 0);
    reportData = {
      credits: filtered,
      total_credit_granted,
      total_outstanding,
      total_recovered: total_credit_granted - total_outstanding
    };
  } else if (tab === 'registers') {
    let register;
    if (register_id) {
      const [rows] = await pool.query('SELECT * FROM cash_registers WHERE id = ?', [register_id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Register session not found' });
      register = rows[0];
    } else {
      const [rows] = await pool.query('SELECT * FROM cash_registers WHERE status = "open" LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'No active cash register session' });
      register = rows[0];
    }
    const openedAt = register.opened_at;
    const closedAt = register.closed_at || new Date();

    const [cashSalesRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total 
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       WHERE p.created_at >= ? AND p.created_at <= ? 
         AND p.method = 'cash' 
         AND p.status IN ('completed', 'pending') 
         AND o.status != 'cancelled'`,
      [openedAt, closedAt]
    );
    const cashSales = parseFloat(cashSalesRows[0].total);

    const [cashRecoveriesRows] = await pool.query(
      'SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_date >= ? AND payment_date <= ? AND payment_method = "cash"',
      [openedAt, closedAt]
    );
    const cashRecoveries = parseFloat(cashRecoveriesRows[0].total);
    const totalCashPayments = cashSales + cashRecoveries;

    const [cardSalesRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total 
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       WHERE p.created_at >= ? AND p.created_at <= ? 
         AND (p.method = 'card' OR p.method = 'visa') 
         AND p.status IN ('completed', 'pending') 
         AND o.status != 'cancelled'`,
      [openedAt, closedAt]
    );
    const cardSales = parseFloat(cardSalesRows[0].total);

    const [cardRecoveriesRows] = await pool.query(
      'SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_date >= ? AND payment_date <= ? AND payment_method = "card"',
      [openedAt, closedAt]
    );
    const cardRecoveries = parseFloat(cardRecoveriesRows[0].total);
    const totalCardPayments = cardSales + cardRecoveries;

    const [chequeSalesRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total 
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       WHERE p.created_at >= ? AND p.created_at <= ? 
         AND p.method = 'cheque' 
         AND p.status IN ('completed', 'pending') 
         AND o.status != 'cancelled'`,
      [openedAt, closedAt]
    );
    const chequeSales = parseFloat(chequeSalesRows[0].total);

    const [bankSalesRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total 
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       WHERE p.created_at >= ? AND p.created_at <= ? 
         AND p.method = 'bank_transfer' 
         AND p.status IN ('completed', 'pending') 
         AND o.status != 'cancelled'`,
      [openedAt, closedAt]
    );
    const bankSales = parseFloat(bankSalesRows[0].total);

    const [otherSalesRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total 
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       WHERE p.created_at >= ? AND p.created_at <= ? 
         AND p.method IN ('apple_pay', 'samsung_pay', 'tap') 
         AND p.status IN ('completed', 'pending') 
         AND o.status != 'cancelled'`,
      [openedAt, closedAt]
    );
    const otherSales = parseFloat(otherSalesRows[0].total);

    const [creditSalesRows] = await pool.query(
      `SELECT COALESCE(SUM(cc.amount), 0) as total 
       FROM customer_credits cc 
       JOIN orders o ON cc.order_id = o.id 
       WHERE cc.created_at >= ? AND cc.created_at <= ? 
         AND o.status != 'cancelled'`,
      [openedAt, closedAt]
    );
    const creditSales = parseFloat(creditSalesRows[0].total);

    const [creditRecoveriesRows] = await pool.query(
      'SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_date >= ? AND payment_date <= ?',
      [openedAt, closedAt]
    );
    const creditRecoveries = parseFloat(creditRecoveriesRows[0].total);

    const [totalExpensesRows] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at >= ? AND created_at <= ?',
      [openedAt, closedAt]
    );
    const totalExpenses = parseFloat(totalExpensesRows[0].total);

    const [cashExpensesRows] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at >= ? AND created_at <= ? AND payment_method = "cash"',
      [openedAt, closedAt]
    );
    const cashExpenses = parseFloat(cashExpensesRows[0].total);

    // Query Free Washes original amount
    const [freeWashRows] = await pool.query(
      `SELECT COALESCE(SUM(o.discount), 0) as total 
       FROM payments p 
       INNER JOIN orders o ON p.order_id = o.id 
       WHERE p.created_at >= ? AND p.created_at <= ? 
         AND p.method = 'free' 
         AND p.status IN ('completed', 'pending') 
         AND o.status != 'cancelled'`,
      [openedAt, closedAt]
    );
    const freeWashAmount = parseFloat(freeWashRows[0].total);

    const totalSales = totalCashPayments + totalCardPayments + bankSales + chequeSales + otherSales + (creditSales - creditRecoveries) + freeWashAmount;
    const amountInCashDrawer = parseFloat(register.opening_balance) + totalCashPayments - cashExpenses;

    reportData = {
      register_id: register.id,
      status: register.status,
      opened_at: register.opened_at,
      closed_at: register.closed_at,
      opening_balance: parseFloat(register.opening_balance),
      closing_balance: register.closing_balance ? parseFloat(register.closing_balance) : null,
      closed_amount: register.closed_amount ? parseFloat(register.closed_amount) : null,
      cash_payments: { total: totalCashPayments, sale: cashSales, recovery: cashRecoveries },
      card_payments: { total: totalCardPayments, sale: cardSales, recovery: cardRecoveries },
      cheque_payments: chequeSales,
      bank_transfer: bankSales,
      other_payments: otherSales,
      credit_sales: creditSales,
      credit_sale_recovery: creditRecoveries,
      free_wash_amount: freeWashAmount,
      total_expense: totalExpenses,
      cash_expense: cashExpenses,
      total_sales: totalSales,
      amount_in_cash_drawer: amountInCashDrawer,
      notes: register.notes
    };
  } else if (tab === 'commission') {
    let dateFilter = '';
    const paramsList = [];
    if (start_date && end_date) {
      dateFilter = 'AND DATE(s.created_at) BETWEEN ? AND ?';
      paramsList.push(start_date, end_date);
    }

    const [saloonServices] = await pool.query(`
      SELECT p.name as service_name, COUNT(s.id) as quantity, COUNT(s.id) * 0.25 as commission
      FROM products p
      LEFT JOIN services s ON p.name = s.service_name AND s.vehicle_type = 'Saloon' AND s.status = 'completed' ${dateFilter}
      WHERE p.category = 'Services' AND p.vehicle_type IN ('Saloon', 'Both')
      GROUP BY p.name ORDER BY p.name ASC
    `, paramsList);

    const [fourx4Services] = await pool.query(`
      SELECT p.name as service_name, COUNT(s.id) as quantity, COUNT(s.id) * 0.25 as commission
      FROM products p
      LEFT JOIN services s ON p.name = s.service_name AND s.vehicle_type = '4x4' AND s.status = 'completed' ${dateFilter}
      WHERE p.category = 'Services' AND p.vehicle_type IN ('4x4', 'Both')
      GROUP BY p.name ORDER BY p.name ASC
    `, paramsList);

    let vipDateFilter = '';
    const vipParams = [];
    if (start_date && end_date) {
      vipDateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      vipParams.push(start_date, end_date);
    }
    const [vipServices] = await pool.query(`
      SELECT types.v_type as vehicle_type, COUNT(DISTINCT o.id) as quantity, COALESCE(SUM(o.total), 0) * 0.25 as commission
      FROM (SELECT 'Saloon' as v_type UNION SELECT '4x4' as v_type) types
      LEFT JOIN vip_customers vc ON vc.vehicle_type = types.v_type
      LEFT JOIN vip_bookings vb ON vb.vip_customer_id = vc.id
      LEFT JOIN orders o ON o.vip_booking_id = vb.id AND o.status != 'cancelled' ${vipDateFilter}
      GROUP BY types.v_type ORDER BY types.v_type ASC
    `, vipParams);

    reportData = { saloon: saloonServices, fourx4: fourx4Services, vip: vipServices };
  } else if (tab === 'service_sales') {
    let dateFilter = '';
    const paramsList = [];
    if (start_date && end_date) {
      dateFilter = 'AND DATE(s.created_at) BETWEEN ? AND ?';
      paramsList.push(start_date, end_date);
    }

    const [saloonServices] = await pool.query(`
      SELECT p.name as service_name, COUNT(s.id) as quantity, COALESCE(AVG(s.price), p.price) as selling_price,
             COALESCE(AVG(s.price), p.price) as net_price, COALESCE(p.purchase_price, 0) as cost_price,
             COALESCE(AVG(s.price), p.price) - COALESCE(p.purchase_price, 0) as profit
      FROM products p
      LEFT JOIN services s ON p.name = s.service_name AND s.vehicle_type = 'Saloon' AND s.status = 'completed' ${dateFilter}
      WHERE p.category = 'Services' AND p.vehicle_type IN ('Saloon', 'Both')
      GROUP BY p.name, p.price, p.purchase_price ORDER BY p.name ASC
    `, paramsList);

    const [fourx4Services] = await pool.query(`
      SELECT p.name as service_name, COUNT(s.id) as quantity, COALESCE(AVG(s.price), p.price) as selling_price,
             COALESCE(AVG(s.price), p.price) as net_price, COALESCE(p.purchase_price, 0) as cost_price,
             COALESCE(AVG(s.price), p.price) - COALESCE(p.purchase_price, 0) as profit
      FROM products p
      LEFT JOIN services s ON p.name = s.service_name AND s.vehicle_type = '4x4' AND s.status = 'completed' ${dateFilter}
      WHERE p.category = 'Services' AND p.vehicle_type IN ('4x4', 'Both')
      GROUP BY p.name, p.price, p.purchase_price ORDER BY p.name ASC
    `, paramsList);

    let vipDateFilter = '';
    const vipParams = [];
    if (start_date && end_date) {
      vipDateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      vipParams.push(start_date, end_date);
    }
    const [vipServices] = await pool.query(`
      SELECT types.v_type as service_name, COUNT(DISTINCT o.id) as quantity, COALESCE(AVG(o.total), 0) as selling_price,
             COALESCE(AVG(CASE WHEN o.discount > 0 THEN o.total - o.discount ELSE o.total END), 0) as net_price,
             0 as cost_price, COALESCE(AVG(CASE WHEN o.discount > 0 THEN o.total - o.discount ELSE o.total END), 0) as profit
      FROM (SELECT 'Saloon' as v_type UNION SELECT '4x4' as v_type) types
      LEFT JOIN vip_customers vc ON vc.vehicle_type = types.v_type
      LEFT JOIN vip_bookings vb ON vb.vip_customer_id = vc.id
      LEFT JOIN orders o ON o.vip_booking_id = vb.id AND o.status != 'cancelled' ${vipDateFilter}
      GROUP BY types.v_type ORDER BY types.v_type ASC
    `, vipParams);

    reportData = { saloon: saloonServices, fourx4: fourx4Services, vip: vipServices };
  }

  if (!reportData) {
    return res.status(404).json({ success: false, message: 'No data found for this report type' });
  }

  // 2. Setup output folder and filename
  const reportsDir = path.join(__dirname, '..', 'uploads', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `report-${tab}-${Date.now()}.pdf`;
  const outputPath = path.join(reportsDir, filename);

  // 3. Generate PDF file
  await generatePDFReport(tab, reportData, params, outputPath);

  // 4. Return download URL
  res.json({
    success: true,
    pdfUrl: `/uploads/reports/${filename}`
  });
});

// @desc    Get Stock report
// @route   GET /api/analytics/reports/stock
// @access  Private (Admin)
const getStockReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date && end_date) {
    dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  const query = `
    SELECT 
      p.id,
      p.name,
      p.category,
      p.stock AS current_stock,
      p.price AS selling_price,
      p.purchase_price AS cost_price,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' ${dateFilter} THEN oi.quantity ELSE 0 END), 0) AS quantity_sold,
      CASE 
        WHEN p.stock = 0 THEN 'Out of Stock'
        WHEN p.stock <= 5 THEN 'Low Stock'
        ELSE 'Good'
      END AS stock_status,
      CASE 
        WHEN p.stock <= 5 THEN (5 - p.stock)
        ELSE 0
      END AS quantity_short
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE p.category != 'Services'
    GROUP BY p.id
    ORDER BY p.name ASC
  `;

  const [stockData] = await pool.query(query, params);

  res.json({
    success: true,
    period: { start_date: start_date || 'All Time', end_date: end_date || 'All Time' },
    stock: stockData
  });
});

// @desc    Get Commission Report
// @route   GET /api/analytics/reports/commission
// @access  Private (Admin)
const getCommissionReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  // Saloon services
  const [saloonServices] = await pool.query(`
    SELECT
      p.name as service_name,
      COUNT(s.id) as quantity,
      COUNT(s.id) * 0.25 as commission
    FROM products p
    LEFT JOIN services s ON (s.service_name = p.name OR s.service_name LIKE CONCAT(p.name, ' (%'))
      AND s.vehicle_type = 'Saloon'
      AND s.status = 'completed'
      ${dateFilter}
    WHERE p.category = 'Services' AND p.vehicle_type IN ('Saloon', 'Both') AND p.name NOT IN ('Body Wash', 'Just Water', 'Saloon VIP Service')
    GROUP BY p.name
    ORDER BY p.name ASC
  `, params);

  // 4x4 services
  const [fourx4Services] = await pool.query(`
    SELECT
      p.name as service_name,
      COUNT(s.id) as quantity,
      COUNT(s.id) * 0.25 as commission
    FROM products p
    LEFT JOIN services s ON (s.service_name = p.name OR s.service_name LIKE CONCAT(p.name, ' (%'))
      AND s.vehicle_type = '4x4'
      AND s.status = 'completed'
      ${dateFilter}
    WHERE p.category = 'Services' AND p.vehicle_type IN ('4x4', 'Both') AND p.name NOT IN ('Body Wash', 'Just Water', '4x4 VIP Service')
    GROUP BY p.name
    ORDER BY p.name ASC
  `, params);

  // VIP orders (orders linked to vip_bookings) grouped by vehicle type (with commission multiplied by 3)
  let vipDateFilter = '';
  const vipParams = [];
  if (start_date && end_date) {
    vipDateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
    vipParams.push(start_date, end_date);
  }

  const [vipServices] = await pool.query(`
    SELECT
      types.v_type as vehicle_type,
      COUNT(DISTINCT o.id) as quantity,
      COUNT(DISTINCT o.id) * 3 as commission
    FROM (SELECT 'Saloon' as v_type UNION SELECT '4x4' as v_type) types
    LEFT JOIN vip_customers vc ON vc.vehicle_type = types.v_type
    LEFT JOIN vip_bookings vb ON vb.vip_customer_id = vc.id
    LEFT JOIN orders o ON o.vip_booking_id = vb.id AND o.status != 'cancelled' ${vipDateFilter}
    GROUP BY types.v_type
    ORDER BY types.v_type ASC
  `, vipParams);

  res.json({
    success: true,
    period: { start_date: start_date || null, end_date: end_date || null },
    saloon: saloonServices || [],
    fourx4: fourx4Services || [],
    vip: vipServices || []
  });
});

// @desc    Get Service Sales Report
// @route   GET /api/analytics/reports/service-sales
// @access  Private (Admin)
const getServiceSalesReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date && end_date) {
    dateFilter = 'AND DATE(s.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  // Saloon services with price details
  const [saloonServices] = await pool.query(`
    SELECT
      p.name as service_name,
      COUNT(s.id) as quantity,
      COALESCE(SUM(s.price), 0) as selling_price,
      COALESCE(SUM(s.price - IF(o.discount > 0, o.discount * (s.price / NULLIF(o.total + o.discount, 0)), 0)), 0) as net_price,
      COALESCE(SUM(IF(s.id IS NOT NULL, p.purchase_price, 0)), 0) as cost_price,
      COALESCE(SUM(s.price - IF(o.discount > 0, o.discount * (s.price / NULLIF(o.total + o.discount, 0)), 0) - COALESCE(p.purchase_price, 0)), 0) as profit
    FROM products p
    LEFT JOIN services s ON (s.service_name = p.name OR s.service_name LIKE CONCAT(p.name, ' (%'))
      AND s.vehicle_type = 'Saloon'
      AND s.status = 'completed'
      ${dateFilter}
    LEFT JOIN orders o ON s.order_id = o.id AND o.status != 'cancelled'
    WHERE p.category = 'Services' AND p.vehicle_type IN ('Saloon', 'Both') AND p.name != 'Saloon VIP Service'
    GROUP BY p.name
    ORDER BY p.name ASC
  `, params);

  // 4x4 services with price details
  const [fourx4Services] = await pool.query(`
    SELECT
      p.name as service_name,
      COUNT(s.id) as quantity,
      COALESCE(SUM(s.price), 0) as selling_price,
      COALESCE(SUM(s.price - IF(o.discount > 0, o.discount * (s.price / NULLIF(o.total + o.discount, 0)), 0)), 0) as net_price,
      COALESCE(SUM(IF(s.id IS NOT NULL, p.purchase_price, 0)), 0) as cost_price,
      COALESCE(SUM(s.price - IF(o.discount > 0, o.discount * (s.price / NULLIF(o.total + o.discount, 0)), 0) - COALESCE(p.purchase_price, 0)), 0) as profit
    FROM products p
    LEFT JOIN services s ON (s.service_name = p.name OR s.service_name LIKE CONCAT(p.name, ' (%'))
      AND s.vehicle_type = '4x4'
      AND s.status = 'completed'
      ${dateFilter}
    LEFT JOIN orders o ON s.order_id = o.id AND o.status != 'cancelled'
    WHERE p.category = 'Services' AND p.vehicle_type IN ('4x4', 'Both') AND p.name != '4x4 VIP Service'
    GROUP BY p.name
    ORDER BY p.name ASC
  `, params);

  // VIP orders by vehicle type
  let vipDateFilter = '';
  const vipParams = [];
  if (start_date && end_date) {
    vipDateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
    vipParams.push(start_date, end_date);
  }

  const [vipServices] = await pool.query(`
    SELECT
      types.v_type as service_name,
      COUNT(DISTINCT o.id) as quantity,
      COALESCE(SUM(o.total + o.discount), 0) as selling_price,
      COALESCE(SUM(o.total), 0) as net_price,
      0 as cost_price,
      COALESCE(SUM(o.total), 0) as profit
    FROM (SELECT 'Saloon' as v_type UNION SELECT '4x4' as v_type) types
    LEFT JOIN vip_customers vc ON vc.vehicle_type = types.v_type
    LEFT JOIN vip_bookings vb ON vb.vip_customer_id = vc.id
    LEFT JOIN orders o ON o.vip_booking_id = vb.id AND o.status != 'cancelled' ${vipDateFilter}
    GROUP BY types.v_type
    ORDER BY types.v_type ASC
  `, vipParams);

  res.json({
    success: true,
    period: { start_date: start_date || null, end_date: end_date || null },
    saloon: saloonServices || [],
    fourx4: fourx4Services || [],
    vip: vipServices || []
  });
});

module.exports = {
  getDashboardAnalytics,
  getSalesReport,
  getDailyBusinessSummary,
  getMonthlySummary,
  getPaymentTypeReport,
  getCustomerWiseReport,
  getSupplierPaymentReport,
  getPurchasesReport,
  getProfitLossReport,
  getStockReport,
  getReportPDF,
  getCommissionReport,
  getServiceSalesReport
};

