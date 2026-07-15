const pool = require('./config/database');

async function test() {
  try {
    // 1. Find a product that is in 'Services'
    const [products] = await pool.query('SELECT * FROM products WHERE category = "Services" LIMIT 1');
    if (products.length === 0) {
      console.log('No services found in products table.');
      return;
    }
    const serviceProduct = products[0];
    console.log('Using service product:', serviceProduct.name, 'ID:', serviceProduct.id);

    // 2. Mock request body similar to POS checkout
    const reqBody = {
      customer_id: null,
      items: [
        {
          product_id: serviceProduct.id,
          quantity: 1,
          price: serviceProduct.price
        }
      ],
      total: serviceProduct.price,
      discount: 0
    };

    const { customer_id, items, total, discount } = reqBody;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let hasService = false;
      for (let item of items) {
        const [prodRows] = await connection.query('SELECT category FROM products WHERE id = ?', [item.product_id]);
        if (prodRows.length > 0 && prodRows[0].category === 'Services') {
          hasService = true;
          break;
        }
      }

      const orderStatus = hasService ? 'processing' : 'completed';
      const serviceStartedAt = hasService ? new Date() : null;
      const serviceCompletedAt = hasService ? null : new Date();

      console.log('Inserting order...');
      const [orderResult] = await connection.query(
        'INSERT INTO orders (customer_id, total, discount, status, payment_status, service_started_at, service_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer_id || null, total, discount || 0, orderStatus, 'pending', serviceStartedAt, serviceCompletedAt]
      );

      const orderId = orderResult.insertId;
      console.log('Order inserted with ID:', orderId);

      let vehicleType = 'Saloon';
      if (customer_id) {
        const [custRows] = await connection.query('SELECT vehicle_type FROM customers WHERE id = ?', [customer_id]);
        if (custRows.length > 0) {
          vehicleType = custRows[0].vehicle_type;
        }
      }

      for (let item of items) {
        console.log('Inserting order item...');
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );

        console.log('Updating stock...');
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        const [prodRows] = await connection.query('SELECT category, name FROM products WHERE id = ?', [item.product_id]);
        if (prodRows.length > 0 && prodRows[0].category === 'Services') {
          console.log('Inserting service task...');
          // Check columns of services table
          await connection.query(
            'INSERT INTO services (customer_id, service_name, vehicle_type, price, description, status, started_at, order_id) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)',
            [customer_id || null, prodRows[0].name, vehicleType, item.price, 'Added via POS Order', 'in_progress', orderId]
          );
        }
      }

      await connection.commit();
      console.log('Transaction committed successfully!');
    } catch (err) {
      console.error('Error during transaction:', err);
      await connection.rollback();
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Initial error:', err);
  } finally {
    await pool.end();
  }
}

test();
