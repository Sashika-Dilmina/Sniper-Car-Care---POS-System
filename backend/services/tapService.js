const axios = require('axios');

const TAP_API_URL = 'https://api.tap.company/v2';

/**
 * Create a charge on Tap Payments
 * @param {Object} params
 * @param {number} params.amount - Amount in AED
 * @param {number|string} params.orderId - The order ID from database
 * @param {string} params.customerName - Customer name
 * @param {string} params.customerPhone - Customer phone number
 * @param {string} params.customerEmail - Customer email
 * @param {string} params.redirectUrl - Redirect URL after payment callback
 * @returns {Promise<Object>} Tap Charge Response
 */
const createCharge = async ({ amount, orderId, customerName, customerPhone, customerEmail, redirectUrl }) => {
  const secretKey = process.env.TAP_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_live_placeholder') {
    throw new Error('Tap API Secret Key is not configured.');
  }

  // Handle phone format
  // Tap requires phone country_code and number.
  let countryCode = '971'; // Default to UAE
  let number = '500000000';
  
  if (customerPhone) {
    // Strip non-numeric chars except +
    const cleanedPhone = customerPhone.replace(/[^\d+]/g, '');
    if (cleanedPhone.startsWith('+')) {
      if (cleanedPhone.startsWith('+971')) {
        countryCode = '971';
        number = cleanedPhone.substring(4);
      } else if (cleanedPhone.startsWith('+94')) {
        countryCode = '94';
        number = cleanedPhone.substring(3);
      } else {
        countryCode = cleanedPhone.substring(1, 4);
        number = cleanedPhone.substring(4);
      }
    } else if (cleanedPhone.startsWith('971')) {
      countryCode = '971';
      number = cleanedPhone.substring(3);
    } else if (cleanedPhone.startsWith('05')) {
      countryCode = '971';
      number = cleanedPhone.substring(1); // remove leading 0
    } else {
      number = cleanedPhone;
    }
  }

  // Handle name split
  const nameParts = (customerName || 'Customer Name').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'Name';

  const payload = {
    amount: parseFloat(amount),
    currency: 'AED',
    threeDSecure: true,
    save_card: false,
    description: `Sniper Car Care Order #${orderId}`,
    statement_descriptor: 'Sniper Car Care',
    metadata: {
      order_id: orderId.toString()
    },
    customer: {
      first_name: firstName,
      last_name: lastName,
      email: customerEmail || 'customer@snipercarcare.com',
      phone: {
        country_code: countryCode,
        number: number
      }
    },
    source: {
      id: 'src_all' // Allow all payment methods (Cards, Apple Pay, etc.)
    },
    redirect: {
      url: redirectUrl
    }
  };

  try {
    const response = await axios.post(`${TAP_API_URL}/charges`, payload, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.errors?.[0]?.description || error.message;
    console.error('[Tap API Error] Create Charge Failed:', error.response?.data || error.message);
    throw new Error(errorMsg);
  }
};

/**
 * Retrieve a charge from Tap Payments by ID
 * @param {string} chargeId - Tap charge ID (chg_...)
 * @returns {Promise<Object>} Tap Charge Response
 */
const getCharge = async (chargeId) => {
  const secretKey = process.env.TAP_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_live_placeholder') {
    throw new Error('Tap API Secret Key is not configured.');
  }

  try {
    const response = await axios.get(`${TAP_API_URL}/charges/${chargeId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.errors?.[0]?.description || error.message;
    console.error('[Tap API Error] Get Charge Failed:', error.response?.data || error.message);
    throw new Error(errorMsg);
  }
};

module.exports = {
  createCharge,
  getCharge
};
