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
         OR LOWER(service_name) LIKE '%body wash%'
         OR LOWER(service_name) LIKE '%just water%'
       )
     ORDER BY id DESC 
     LIMIT 5`,
    [customerId]
  );

  if (rows.length < 5) {
    if (rows.length === 0) return 20.00; // minimum saloon price
    return Math.max(...rows.map(r => parseFloat(r.price)));
  }

  // Sort prices descending
  const prices = rows.map(r => parseFloat(r.price)).sort((a, b) => b - a);
  
  // The 3rd element in sorted descending list represents the cap
  return prices[2];
}

module.exports = { calculateFreeWashCap };
