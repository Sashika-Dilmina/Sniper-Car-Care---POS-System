const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all customer credits
// @route   GET /api/credits
// @access  Private (Admin & Staff)
const getCustomerCredits = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  let query = `
    SELECT cc.*, 
           COALESCE(c.name, 'Customer') as customer_name, 
           COALESCE(c.phone, 'N/A') as customer_phone, 
           COALESCE(c.vehicle_plate, 'N/A') as vehicle_plate, 
           COALESCE(c.vehicle_type, 'Saloon') as vehicle_type
    FROM customer_credits cc
    LEFT JOIN customers c ON cc.customer_id = c.id
    LEFT JOIN orders o ON cc.order_id = o.id
    WHERE (o.status IS NULL OR (o.status != 'cancelled' AND (o.is_deleted = 0 OR o.is_deleted IS NULL)))
  `;
  const params = [];

  if (status) {
    query += ' AND cc.status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.vehicle_plate LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY cc.status ASC, cc.created_at DESC';

  const [credits] = await pool.query(query, params);
  res.json({ success: true, count: credits.length, credits });
});

// @desc    Create a customer credit record
// @route   POST /api/credits
// @access  Private (Admin & Staff)
const createCustomerCredit = asyncHandler(async (req, res) => {
  const { customer_id, order_id, amount } = req.body;

  if (!customer_id || !order_id || !amount) {
    return res.status(400).json({ success: false, message: 'Customer ID, Order ID, and amount are required' });
  }

  // Insert customer credit record
  const [result] = await pool.query(
    'INSERT INTO customer_credits (customer_id, order_id, amount, remaining_amount, status) VALUES (?, ?, ?, ?, ?)',
    [customer_id, order_id, parseFloat(amount), parseFloat(amount), 'unpaid']
  );

  const [newCredit] = await pool.query('SELECT * FROM customer_credits WHERE id = ?', [result.insertId]);
  res.status(201).json({ success: true, message: 'Credit record created successfully', credit: newCredit[0] });
});

// @desc    Recover cash/card for a customer credit
// @route   POST /api/credits/:id/recover
// @access  Private (Admin & Staff)
const recoverCreditPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount_paid, payment_method, notes } = req.body;

  if (!amount_paid || !payment_method) {
    return res.status(400).json({ success: false, message: 'Amount paid and payment method are required' });
  }

  const payAmt = parseFloat(amount_paid);

  // 1. Fetch the credit record
  const [credits] = await pool.query('SELECT * FROM customer_credits WHERE id = ?', [id]);
  if (credits.length === 0) {
    return res.status(404).json({ success: false, message: 'Credit record not found' });
  }

  const credit = credits[0];
  const newRemaining = Math.max(0, parseFloat(credit.remaining_amount) - payAmt);
  const newStatus = newRemaining === 0 ? 'fully_paid' : 'partially_paid';

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 2. Insert into credit_payments
    await connection.query(
      'INSERT INTO credit_payments (credit_id, amount_paid, payment_method, notes) VALUES (?, ?, ?, ?)',
      [id, payAmt, payment_method, notes || `Credit recovered via POS - ${payment_method}`]
    );

    // 3. Update customer_credits
    await connection.query(
      'UPDATE customer_credits SET remaining_amount = ?, status = ? WHERE id = ?',
      [newRemaining, newStatus, id]
    );

    // 4. Insert into the main payments table to link the payment to the order
    await connection.query(
      'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
      [credit.order_id, payAmt, payment_method, 'completed']
    );

    // 5. If fully paid, update the order's payment status to 'paid'
    if (newRemaining === 0) {
      await connection.query(
        "UPDATE orders SET payment_status = 'paid' WHERE id = ?",
        [credit.order_id]
      );
    }

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: 'Credit payment recorded successfully',
      remaining_amount: newRemaining,
      status: newStatus
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
});

// @desc    Get credit payment history for a customer credit
// @route   GET /api/credits/:id/history
// @access  Private (Admin & Staff)
const getCreditHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [payments] = await pool.query(
    'SELECT * FROM credit_payments WHERE credit_id = ? ORDER BY payment_date DESC',
    [id]
  );
  res.json({ success: true, count: payments.length, payments });
});

module.exports = {
  getCustomerCredits,
  createCustomerCredit,
  recoverCreditPayment,
  getCreditHistory
};
