const axios = require('axios');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

async function testCheckout() {
  try {
    const apiBase = 'http://localhost:5000';
    
    // Get a real product ID
    const [products] = await pool.query('SELECT id, price FROM products LIMIT 1');
    if (products.length === 0) {
      console.log('No products found in DB');
      return;
    }
    const product = products[0];
    console.log(`Using product ID: ${product.id}, price: ${product.price}`);

    // Get a real customer ID (or null)
    const [customers] = await pool.query('SELECT id FROM customers LIMIT 1');
    const customerId = customers.length > 0 ? customers[0].id : null;
    console.log(`Using customer ID: ${customerId}`);

    // Get a real user ID to sign token
    const [users] = await pool.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('No users found in DB to sign token');
      return;
    }
    const userId = users[0].id;
    console.log(`Using user ID for auth: ${userId}`);

    // Sign JWT token
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'sniper_car_care_super_secret_key_2024');
    const headers = {
      Authorization: `Bearer ${token}`
    };

    console.log('1. Posting to /api/orders...');
    const orderData = {
      customer_id: customerId,
      items: [{
        product_id: product.id,
        quantity: 1,
        price: parseFloat(product.price)
      }],
      total: parseFloat(product.price),
      discount: 0
    };

    const orderResponse = await axios.post(`${apiBase}/api/orders`, orderData, { headers });
    const createdOrder = orderResponse.data.order;
    console.log('Order created response:', orderResponse.status, createdOrder);

    console.log('2. Posting to /api/payments/manual...');
    const paymentResponse = await axios.post(`${apiBase}/api/payments/manual`, {
      order_id: createdOrder.id,
      amount: parseFloat(product.price),
      method: 'cash',
      status: 'pending'
    }, { headers });
    console.log('Payment response:', paymentResponse.status, paymentResponse.data);

  } catch (err) {
    console.error('API call failed:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }
  } finally {
    await pool.end();
  }
}

testCheckout();
