const pool = require('../config/database');

async function testCheckout() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    // 1. Create a dummy customer
    const [custResult] = await connection.query(
      'INSERT INTO customers (name, phone, vehicle_plate, vehicle_type) VALUES (?, ?, ?, ?)',
      ['Test POS Customer', '+971500000000', 'DXB A 12345', 'Saloon']
    );
    const customerId = custResult.insertId;
    console.log('Created customer ID:', customerId);

    // 2. Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_id, total, discount, payment_status, status) VALUES (?, ?, ?, ?, ?)',
      [customerId, 100.00, 0.00, 'pending', 'pending']
    );
    const orderId = orderResult.insertId;
    console.log('Created order ID:', orderId);

    // 3. Process manual payment (pending)
    // Run the query logic from paymentController.js
    const status = 'pending';
    const amount = 100.00;
    const method = 'cash';
    
    await connection.query(
      'INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)',
      [orderId, amount, method, status]
    );
    console.log('Inserted payment record.');

    const [orders] = await connection.query(
      'SELECT total, vip_booking_id FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length > 0) {
      const orderTotal = parseFloat(orders[0].total);
      const [payments] = await connection.query(
        'SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ? AND status = "completed"',
        [orderId]
      );

      // In the original code, this line had:
      // const totalPaid = parseFloat(payments[0].total_paid || 0) + parseFloat(amount);
      // Let's see if this query or variable parsing throws an error.
      const totalPaid = parseFloat(payments[0].total_paid || 0); 
      console.log('totalPaid calculated successfully:', totalPaid);

      const newPaymentStatus = totalPaid >= orderTotal ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');
      await connection.query(
        'UPDATE orders SET payment_status = ? WHERE id = ?',
        [newPaymentStatus, orderId]
      );
      console.log('Updated order status to:', newPaymentStatus);
    }

    await connection.rollback();
    console.log('Test completed successfully and rolled back.');
  } catch (err) {
    console.error('Test failed with error:', err);
    await connection.rollback();
  } finally {
    connection.release();
    await pool.end();
  }
}

testCheckout();
