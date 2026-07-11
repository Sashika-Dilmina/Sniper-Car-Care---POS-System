const axios = require('axios');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

async function testCheckout() {
  try {
    const apiBase = 'http://localhost:5000';
    
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

    console.log('1. Posting to /api/orders with VIP and Ceramic Wash...');
    const orderData = {
      customer_id: 6, // customer sangeethma
      items: [
        {
          product_id: 48, // Saloon VIP Service
          quantity: 1,
          price: 75.00
        },
        {
          product_id: 46, // Ceramic Wash
          quantity: 1,
          price: 30.00
        }
      ],
      total: 105.00,
      discount: 0
    };

    const orderResponse = await axios.post(`${apiBase}/api/orders`, orderData, { headers });
    const createdOrder = orderResponse.data.order;
    console.log('Order created response:', orderResponse.status, createdOrder);

    console.log('2. Posting to /api/payments/manual...');
    const paymentResponse = await axios.post(`${apiBase}/api/payments/manual`, {
      order_id: createdOrder.id,
      amount: 105.00,
      method: 'card',
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
