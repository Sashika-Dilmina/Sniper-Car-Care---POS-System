const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get active register
// @route   GET /api/registers/active
// @access  Private
const getActiveRegister = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT r.*, u.name as opened_by_name FROM cash_registers r JOIN users u ON r.opened_by = u.id WHERE r.status = "open" ORDER BY r.opened_at DESC LIMIT 1'
  );
  
  if (rows.length === 0) {
    return res.json({ success: true, active: false, register: null });
  }

  res.json({ success: true, active: true, register: rows[0] });
});

// @desc    Open a register
// @route   POST /api/registers/open
// @access  Private
const openRegister = asyncHandler(async (req, res) => {
  const { opening_balance } = req.body;

  if (opening_balance === undefined || opening_balance === null || isNaN(opening_balance)) {
    return res.status(400).json({ message: 'Valid opening balance is required' });
  }

  // Check if there's already an open register
  const [activeRows] = await pool.query('SELECT id FROM cash_registers WHERE status = "open"');
  if (activeRows.length > 0) {
    return res.status(400).json({ message: 'A cash register is already open.' });
  }

  const [result] = await pool.query(
    'INSERT INTO cash_registers (opened_by, opening_balance, status) VALUES (?, ?, "open")',
    [req.user.id, parseFloat(opening_balance)]
  );

  const [newRegister] = await pool.query('SELECT * FROM cash_registers WHERE id = ?', [result.insertId]);

  res.status(201).json({
    success: true,
    message: 'Cash register opened successfully',
    register: newRegister[0]
  });
});

// @desc    Get register report (active or closed)
// @route   GET /api/registers/report
// @access  Private
const getRegisterReport = asyncHandler(async (req, res) => {
  const { register_id } = req.query;

  let register;
  if (register_id) {
    const [rows] = await pool.query('SELECT * FROM cash_registers WHERE id = ?', [register_id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Register session not found' });
    }
    register = rows[0];
  } else {
    // Get active register
    const [rows] = await pool.query('SELECT * FROM cash_registers WHERE status = "open" LIMIT 1');
    if (rows.length === 0) {
      return res.json({ success: false, message: 'No active cash register session' });
    }
    register = rows[0];
  }

  const openedAt = register.opened_at;
  const closedAt = register.closed_at || new Date();

  // Query Cash Payments from regular sales
  const [cashSalesRows] = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) as total 
     FROM payments p 
     JOIN orders o ON p.order_id = o.id 
     WHERE p.created_at >= ? AND p.created_at <= ? 
       AND p.method = 'cash' 
       AND p.status = 'completed' 
       AND o.payment_status IN ('paid', 'free')
       AND o.status != 'cancelled'`,
    [openedAt, closedAt]
  );
  const cashSales = parseFloat(cashSalesRows[0].total);

  // Query Cash Credit Recoveries
  const [cashRecoveriesRows] = await pool.query(
    'SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_date >= ? AND payment_date <= ? AND payment_method = "cash"',
    [openedAt, closedAt]
  );
  const cashRecoveries = parseFloat(cashRecoveriesRows[0].total);
  const totalCashPayments = cashSales + cashRecoveries;

  // Query Card Payments from regular sales
  const [cardSalesRows] = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) as total 
     FROM payments p 
     JOIN orders o ON p.order_id = o.id 
     WHERE p.created_at >= ? AND p.created_at <= ? 
       AND (p.method = 'card' OR p.method = 'visa') 
       AND p.status = 'completed' 
       AND o.payment_status IN ('paid', 'free')
       AND o.status != 'cancelled'`,
    [openedAt, closedAt]
  );
  const cardSales = parseFloat(cardSalesRows[0].total);

  // Query Card Credit Recoveries
  const [cardRecoveriesRows] = await pool.query(
    'SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_date >= ? AND payment_date <= ? AND payment_method = "card"',
    [openedAt, closedAt]
  );
  const cardRecoveries = parseFloat(cardRecoveriesRows[0].total);
  const totalCardPayments = cardSales + cardRecoveries;

  // Query Cheque Payments
  const [chequeSalesRows] = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) as total 
     FROM payments p 
     JOIN orders o ON p.order_id = o.id 
     WHERE p.created_at >= ? AND p.created_at <= ? 
       AND p.method = 'cheque' 
       AND p.status = 'completed' 
       AND o.payment_status IN ('paid', 'free')
       AND o.status != 'cancelled'`,
    [openedAt, closedAt]
  );
  const chequeSales = parseFloat(chequeSalesRows[0].total);

  // Query Bank Transfer
  const [bankSalesRows] = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) as total 
     FROM payments p 
     JOIN orders o ON p.order_id = o.id 
     WHERE p.created_at >= ? AND p.created_at <= ? 
       AND p.method = 'bank_transfer' 
       AND p.status = 'completed' 
       AND o.payment_status IN ('paid', 'free')
       AND o.status != 'cancelled'`,
    [openedAt, closedAt]
  );
  const bankSales = parseFloat(bankSalesRows[0].total);

  // Query Other Payments (apple_pay, samsung_pay, tap)
  const [otherSalesRows] = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) as total 
     FROM payments p 
     JOIN orders o ON p.order_id = o.id 
     WHERE p.created_at >= ? AND p.created_at <= ? 
       AND p.method IN ('apple_pay', 'samsung_pay', 'tap') 
       AND p.status = 'completed' 
       AND o.payment_status IN ('paid', 'free')
       AND o.status != 'cancelled'`,
    [openedAt, closedAt]
  );
  const otherSales = parseFloat(otherSalesRows[0].total);

  // Query Free Washes original amount
  const [freeWashRows] = await pool.query(
    `SELECT COALESCE(SUM(o.discount), 0) as total 
     FROM payments p 
     INNER JOIN orders o ON p.order_id = o.id 
     WHERE p.created_at >= ? AND p.created_at <= ? 
       AND p.method = 'free' 
       AND o.payment_status = 'free' 
       AND o.status != 'cancelled'`,
    [openedAt, closedAt]
  );
  const freeWashAmount = parseFloat(freeWashRows[0].total);

  // Query Credit Sales
  const [creditSalesRows] = await pool.query(
    `SELECT COALESCE(SUM(cc.amount), 0) as total 
     FROM customer_credits cc 
     JOIN orders o ON cc.order_id = o.id 
     WHERE cc.created_at >= ? AND cc.created_at <= ? 
       AND o.status != 'cancelled'`,
    [openedAt, closedAt]
  );
  const creditSales = parseFloat(creditSalesRows[0].total);

  // Query Credit Recoveries (Total paid for credits during the session)
  const [creditRecoveriesRows] = await pool.query(
    'SELECT COALESCE(SUM(amount_paid), 0) as total FROM credit_payments WHERE payment_date >= ? AND payment_date <= ?',
    [openedAt, closedAt]
  );
  const creditRecoveries = parseFloat(creditRecoveriesRows[0].total);

  // Query Expenses (total expenses)
  const [totalExpensesRows] = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at >= ? AND created_at <= ?',
    [openedAt, closedAt]
  );
  const totalExpenses = parseFloat(totalExpensesRows[0].total);

  // Query Cash Expenses
  const [cashExpensesRows] = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at >= ? AND created_at <= ? AND payment_method = "cash"',
    [openedAt, closedAt]
  );
  const cashExpenses = parseFloat(cashExpensesRows[0].total);

  // Calculate Total Sales
  // Formula: Cash + Card + Bank Transfer + Cheque + Other Payments + (Credit Sales - Credit Recovery) + Free Wash Amount - Sales Return (Sales Return is 0)
  const totalSales = totalCashPayments + totalCardPayments + bankSales + chequeSales + otherSales + (creditSales - creditRecoveries) + freeWashAmount;

  // Amount in Cash Drawer
  // Formula: Opening Balance + Cash Payments - Cash Expenses
  const amountInCashDrawer = parseFloat(register.opening_balance) + totalCashPayments - cashExpenses;

  res.json({
    success: true,
    report: {
      register_id: register.id,
      status: register.status,
      opened_at: register.opened_at,
      closed_at: register.closed_at,
      opening_balance: parseFloat(register.opening_balance),
      closing_balance: register.closing_balance ? parseFloat(register.closing_balance) : null,
      closed_amount: register.closed_amount ? parseFloat(register.closed_amount) : null,
      cash_payments: {
        total: totalCashPayments,
        sale: cashSales,
        recovery: cashRecoveries
      },
      card_payments: {
        total: totalCardPayments,
        sale: cardSales,
        recovery: cardRecoveries
      },
      cheque_payments: chequeSales,
      bank_transfer: bankSales,
      other_payments: otherSales,
      credit_sales: creditSales,
      credit_sale_recovery: creditRecoveries,
      free_wash_amount: freeWashAmount,
      sale_return: 0.00,
      total_expense: totalExpenses,
      cash_expense: cashExpenses,
      total_sales: totalSales,
      amount_in_cash_drawer: amountInCashDrawer,
      notes: register.notes
    }
  });
});

// @desc    Close register
// @route   POST /api/registers/close
// @access  Private
const closeRegister = asyncHandler(async (req, res) => {
  const { closed_amount, notes } = req.body;

  if (closed_amount === undefined || closed_amount === null || isNaN(closed_amount)) {
    return res.status(400).json({ message: 'Valid closed amount is required' });
  }

  // Get active register
  const [rows] = await pool.query('SELECT * FROM cash_registers WHERE status = "open" LIMIT 1');
  if (rows.length === 0) {
    return res.status(400).json({ message: 'No active register is open.' });
  }

  const register = rows[0];

  // Check for any unsettled saloon or 4x4 vehicles / orders (excluding VIP bookings)
  // Both service (status = 'completed') AND payment (payment_status IN ('paid', 'credit', 'free')) must be completed before closing register.
  const [unsettledOrders] = await pool.query(
    `SELECT o.id, o.status, o.payment_status, c.vehicle_plate
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.status != 'cancelled' 
       AND o.payment_status != 'cancelled'
       AND (o.is_deleted = 0 OR o.is_deleted IS NULL)
       AND (
         (o.payment_status != 'credit' AND o.status != 'completed') 
         OR o.payment_status NOT IN ('paid', 'credit', 'free')
       )
       AND o.vip_booking_id IS NULL
       AND NOT EXISTS (
         SELECT 1 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = o.id AND (p.category = 'VIP' OR LOWER(p.name) LIKE '%vip%')
       )
       AND (o.created_at >= ? OR DATE(o.created_at) = DATE(?))
     ORDER BY o.id ASC`,
    [register.opened_at, register.opened_at]
  );

  if (unsettledOrders.length > 0) {
    const orderDetails = unsettledOrders
      .slice(0, 5)
      .map(o => `#${o.id}${o.vehicle_plate ? ` (${o.vehicle_plate})` : ''} [Service: ${o.status}, Payment: ${o.payment_status}]`)
      .join(', ');
    const moreCount = unsettledOrders.length > 5 ? ` and ${unsettledOrders.length - 5} more` : '';
    return res.status(400).json({ 
      message: `Cannot close register. There are ${unsettledOrders.length} order(s) pending completion or payment: ${orderDetails}${moreCount}. Both service and payment must be completed before closing register.` 
    });
  }

  const openedAt = register.opened_at;
  const closedAt = new Date();

  // Compute stats to save closing balance
  const [cashSalesRows] = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) as total 
     FROM payments p 
     JOIN orders o ON p.order_id = o.id 
     WHERE p.created_at >= ? AND p.created_at <= ? 
       AND p.method = 'cash' 
       AND p.status = 'completed' 
       AND o.payment_status IN ('paid', 'free')
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

  const [cashExpensesRows] = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at >= ? AND created_at <= ? AND payment_method = "cash"',
    [openedAt, closedAt]
  );
  const cashExpenses = parseFloat(cashExpensesRows[0].total);

  const amountInCashDrawer = parseFloat(register.opening_balance) + totalCashPayments - cashExpenses;

  // Update register row
  await pool.query(
    'UPDATE cash_registers SET status = "closed", closed_at = CURRENT_TIMESTAMP, closed_by = ?, closing_balance = ?, closed_amount = ?, notes = ? WHERE id = ?',
    [req.user.id, amountInCashDrawer, parseFloat(closed_amount), notes || null, register.id]
  );

  res.json({
    success: true,
    message: 'Register closed successfully',
    register_id: register.id,
    closing_balance: amountInCashDrawer,
    closed_amount: parseFloat(closed_amount)
  });
});

// @desc    Get all register sessions
// @route   GET /api/registers/list
// @access  Private
const getRegistersList = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, u1.name as opened_by_name, u2.name as closed_by_name 
     FROM cash_registers r 
     LEFT JOIN users u1 ON r.opened_by = u1.id 
     LEFT JOIN users u2 ON r.closed_by = u2.id 
     ORDER BY r.opened_at DESC`
  );
  res.json({ success: true, registers: rows });
});

module.exports = {
  getActiveRegister,
  openRegister,
  getRegisterReport,
  closeRegister,
  getRegistersList
};
