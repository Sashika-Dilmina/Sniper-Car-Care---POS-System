const db = require('../config/database');

/**
 * Calculates the price cap for a customer's free wash.
 * Rule: Group by the price of the last 5 eligible completed paid washes.
 * The cap is the highest price tier that has a count of at least 3 washes
 * (either directly or combined with higher price tiers).
 * 
 * Mathematically, sorting the 5 latest wash prices in descending order
 * and taking the 3rd element (index 2) always yields this cap.
 * 
 * @param {object} connectionOrPool Database connection or pool
 * @param {number} customerId Customer ID
 * @returns {Promise<number>} Price cap value
 */
async function calculateFreeWashCap(connectionOrPool, customerId) {
  const conn = connectionOrPool || db;
  const [rows] = await conn.query(
    `SELECT price, service_name 
     FROM services 
     WHERE customer_id = ? 
       AND status = 'completed' 
       AND price > 0
       AND (
         LOWER(service_name) LIKE '%full body%'
         OR LOWER(service_name) LIKE '%ceramic%'
         OR LOWER(service_name) LIKE '%double soap%'
         OR LOWER(service_name) LIKE '%vip%'
       )
     ORDER BY id DESC 
     LIMIT 5`,
    [customerId]
  );

  if (rows.length === 0) return 20.00; // minimum saloon price

  // Count occurrences of each eligible category
  const counts = {};
  const prices = {};

  for (let row of rows) {
    const name = row.service_name.toLowerCase().trim();
    let normalized = '';
    if (name.includes('full body') || name.includes('full service') || name.includes('full wash')) {
      normalized = 'full_body';
    } else if (name.includes('double soap')) {
      normalized = 'double_soap';
    } else if (name.includes('ceramic')) {
      normalized = 'ceramic';
    } else if (name.includes('vip')) {
      normalized = 'vip';
    } else {
      continue;
    }
    counts[normalized] = (counts[normalized] || 0) + 1;
    prices[normalized] = parseFloat(row.price);
  }

  // Find the service with the maximum count
  let maxCount = 0;
  let maxService = null;
  for (let key in counts) {
    if (counts[key] > maxCount) {
      maxCount = counts[key];
      maxService = key;
    } else if (counts[key] === maxCount && maxService) {
      if (prices[key] > prices[maxService]) {
        maxService = key;
      }
    }
  }

  // If a service has been used 3 or more times, that is the cap
  if (maxService && maxCount >= 3) {
    return prices[maxService];
  } else {
    // If no service has count >= 3, default to the highest price among the last 5 washes
    let highestPrice = 0;
    for (let row of rows) {
      const p = parseFloat(row.price);
      if (p > highestPrice) highestPrice = p;
    }
    return highestPrice;
  }
}

module.exports = { calculateFreeWashCap };
