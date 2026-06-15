const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const XLSX = require('xlsx');

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
  const { period = 'today' } = req.query; // today, week, month, year

  let dateFilter = '';
  const params = [];

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

  // Payment breakdown by method - use payment date filter
  let paymentDateFilter = dateFilter.replace(/created_at/g, 'p.created_at');
  let paymentBreakdown;
  try {
    const [paymentResult] = await pool.query(
      `SELECT 
        p.method,
        COALESCE(SUM(p.amount), 0) as total_amount
       FROM payments p
       WHERE ${paymentDateFilter} AND p.status = 'completed'
       GROUP BY p.method`
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
      `SELECT COUNT(*) as total_customers FROM customers`
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
             COALESCE(SUM(total), 0) as sales,
             COUNT(*) as orders
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND payment_status = 'paid'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    salesByDay = salesByDayResult;
  } catch (error) {
    console.error('Sales by day query error:', error);
    salesByDay = [];
  }

  // Product categories revenue
  let categoryRevenue = [];
  try {
    const [categoryRevenueResult] = await pool.query(`
      SELECT p.category,
             SUM(oi.quantity * oi.price) as revenue,
             SUM(oi.quantity) as quantity_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${dateFilter.replace(/created_at/g, 'o.created_at')} AND o.payment_status = 'paid'
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
      pending_count: parseInt(pendingPayments[0]?.pending_count || 0)
    },
    top_customers: topCustomers || [],
    top_services: topServices || [],
    sales_by_day: salesByDay || [],
    category_revenue: categoryRevenue || [],
    new_customers: newCustomers || [],
    recent_feedback: recentFeedback || []
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
    WHERE o.payment_status = 'paid'
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
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
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

  // Orders summary
  const [ordersSummary] = await pool.query(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(SUM(discount), 0) as total_discounts,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders
    FROM orders
    WHERE DATE(created_at) = ?
  `, [targetDate]);

  // Services summary
  const [servicesSummary] = await pool.query(`
    SELECT 
      COUNT(*) as total_services,
      COALESCE(SUM(price), 0) as services_revenue,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_services,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_services
    FROM services
    WHERE DATE(created_at) = ?
  `, [targetDate]);

  // Payments by method
  const [paymentMethods] = await pool.query(`
    SELECT 
      p.method,
      COUNT(*) as count,
      COALESCE(SUM(p.amount), 0) as total_amount
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE DATE(o.created_at) = ? AND p.status = 'completed'
    GROUP BY p.method
  `, [targetDate]);

  // Top products sold
  const [topProducts] = await pool.query(`
    SELECT 
      p.name,
      p.category,
      SUM(oi.quantity) as quantity_sold,
      SUM(oi.quantity * oi.price) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) = ? AND o.payment_status = 'paid'
    GROUP BY p.id
    ORDER BY revenue DESC
    LIMIT 10
  `, [targetDate]);

  const reportData = {
    date: targetDate,
    orders: ordersSummary[0] || {},
    services: servicesSummary[0] || {},
    payment_methods: paymentMethods || [],
    top_products: topProducts || []
  };

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Daily Business Summary', targetDate],
      [''],
      ['Orders Summary'],
      ['Total Orders', reportData.orders.total_orders || 0],
      ['Total Revenue', reportData.orders.total_revenue || 0],
      ['Total Discounts', reportData.orders.total_discounts || 0],
      ['Paid Orders', reportData.orders.paid_orders || 0],
      ['Pending Orders', reportData.orders.pending_orders || 0],
      [''],
      ['Services Summary'],
      ['Total Services', reportData.services.total_services || 0],
      ['Services Revenue', reportData.services.services_revenue || 0],
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
      COALESCE(SUM(total), 0) as daily_revenue,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
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
      COALESCE(SUM(o.total), 0) as total_revenue,
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(s.price), 0) as total_services_revenue,
      COUNT(DISTINCT s.id) as total_services,
      COUNT(DISTINCT o.customer_id) as unique_customers
    FROM orders o
    LEFT JOIN services s ON DATE(s.created_at) = DATE(o.created_at)
    WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ? AND o.payment_status = 'paid'
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
    dateFilter = 'AND DATE(p.created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  // Payment breakdown by method
  const [paymentBreakdown] = await pool.query(`
    SELECT 
      p.method,
      COUNT(*) as transaction_count,
      COALESCE(SUM(p.amount), 0) as total_amount,
      COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
      COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE 1=1 ${dateFilter}
    GROUP BY p.method
    ORDER BY total_amount DESC
  `, params);

  // Payment status summary
  const [statusSummary] = await pool.query(`
    SELECT 
      p.status,
      COUNT(*) as count,
      COALESCE(SUM(p.amount), 0) as total_amount
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE 1=1 ${dateFilter}
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

module.exports = {
  getDashboardAnalytics,
  getSalesReport,
  getDailyBusinessSummary,
  getMonthlySummary,
  getPaymentTypeReport,
  getCustomerWiseReport,
  getSupplierPaymentReport,
  getPurchasesReport
};

