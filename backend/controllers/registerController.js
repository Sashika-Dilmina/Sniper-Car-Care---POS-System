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

  res.json({
    success: true,
    report: await buildRegisterReport(register)
  });
});

// Builds the register session report. Shared by the on-screen report, the PDF export
// and register closing so all of them always show the same figures.
const buildRegisterReport = async (register) => {
  const openedAt = register.opened_at;
  const closedAt = register.closed_at || new Date();

  // A payment counts when it was completed during the session on an order that is not
  // cancelled/deleted. The order's payment_status is deliberately NOT checked: cash taken
  // on a partially paid order or on a split payment (part cash, part credit) is still in the drawer.
  const VALID_ORDER = `o.status != 'cancelled' AND o.payment_status != 'cancelled' AND (o.is_deleted = 0 OR o.is_deleted IS NULL)`;
  const NOT_RECOVERY = '(p.is_credit_recovery = 0 OR p.is_credit_recovery IS NULL)';

  const sumPayments = async (methods) => {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.created_at >= ? AND p.created_at <= ?
         AND p.method IN (?)
         AND p.status = 'completed'
         AND ${NOT_RECOVERY}
         AND ${VALID_ORDER}`,
      [openedAt, closedAt, methods]
    );
    return parseFloat(rows[0].total);
  };

  // Credit recoveries received during the session (by payment method)
  const sumRecoveries = async (method) => {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(cp.amount_paid), 0) as total
       FROM credit_payments cp
       JOIN customer_credits cc ON cp.credit_id = cc.id
       LEFT JOIN orders o ON cc.order_id = o.id
       WHERE cp.payment_date >= ? AND cp.payment_date <= ?
         ${method ? 'AND cp.payment_method = ?' : ''}
         AND (o.id IS NULL OR (o.status != 'cancelled' AND (o.is_deleted = 0 OR o.is_deleted IS NULL)))`,
      method ? [openedAt, closedAt, method] : [openedAt, closedAt]
    );
    return parseFloat(rows[0].total);
  };

  const sumExpenses = async (cashOnly) => {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE created_at >= ? AND created_at <= ?
         AND (is_deleted = 0 OR is_deleted IS NULL)
         ${cashOnly ? "AND payment_method = 'cash'" : ''}`,
      [openedAt, closedAt]
    );
    return parseFloat(rows[0].total);
  };

  const [
    cashSales,
    cardSales,
    chequeSales,
    bankSales,
    otherSales,
    cashRecoveries,
    cardRecoveries,
    creditRecoveries,
    totalExpenses,
    cashExpenses,
    [freeWashRows],
    [creditSalesRows]
  ] = await Promise.all([
    sumPayments(['cash']),
    sumPayments(['card', 'visa', 'mastercard', 'master_card', 'master']),
    sumPayments(['cheque']),
    sumPayments(['bank_transfer']),
    sumPayments(['apple_pay', 'samsung_pay', 'tap', 'tap_payments']),
    sumRecoveries('cash'),
    sumRecoveries('card'),
    sumRecoveries(null),
    sumExpenses(false),
    sumExpenses(true),
    // Free washes original amount
    pool.query(
      `SELECT COALESCE(SUM(o.discount), 0) as total
       FROM payments p
       INNER JOIN orders o ON p.order_id = o.id
       WHERE p.created_at >= ? AND p.created_at <= ?
         AND p.method = 'free'
         AND p.status = 'completed'
         AND ${VALID_ORDER}`,
      [openedAt, closedAt]
    ),
    // Credit sales granted during the session
    pool.query(
      `SELECT COALESCE(SUM(cc.amount), 0) as total
       FROM customer_credits cc
       JOIN orders o ON cc.order_id = o.id
       WHERE cc.created_at >= ? AND cc.created_at <= ?
         AND o.status != 'cancelled'
         AND (o.is_deleted = 0 OR o.is_deleted IS NULL)`,
      [openedAt, closedAt]
    )
  ]);

  const freeWashAmount = parseFloat(freeWashRows[0].total);
  const creditSales = parseFloat(creditSalesRows[0].total);
  const totalCashPayments = cashSales + cashRecoveries;
  const totalCardPayments = cardSales + cardRecoveries;

  // Total Sales = everything sold during the session (direct payments + credit granted + free washes).
  // Credit recoveries are money for sales made earlier, so they are not sales of this session.
  const totalSales = cashSales + cardSales + bankSales + chequeSales + otherSales + creditSales + freeWashAmount;

  // Amount in Cash Drawer = Opening Balance + all cash received (sales + recoveries) - cash expenses
  const amountInCashDrawer = parseFloat(register.opening_balance) + totalCashPayments - cashExpenses;

  const toNumberOrNull = (v) => (v === null || v === undefined ? null : parseFloat(v));

  return {
      register_id: register.id,
      status: register.status,
      opened_at: register.opened_at,
      closed_at: register.closed_at,
      opening_balance: parseFloat(register.opening_balance),
      closing_balance: toNumberOrNull(register.closing_balance),
      // 0 is a valid amount handed back by staff, so only null/undefined means "not closed"
      closed_amount: toNumberOrNull(register.closed_amount),
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
  };
};

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

  // Compute the closing balance with the same builder the register report uses,
  // so the saved closing balance always matches the printed statement.
  const sessionReport = await buildRegisterReport({ ...register, closed_at: new Date() });
  const amountInCashDrawer = sessionReport.amount_in_cash_drawer;

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
  getRegistersList,
  buildRegisterReport
};
