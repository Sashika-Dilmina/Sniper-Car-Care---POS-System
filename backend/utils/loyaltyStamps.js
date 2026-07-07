/**
 * Punch-card loyalty: 5 paid washes → 6th wash free, then cycle resets.
 * Stamps increment only on customer website service orders (not ANPR scan).
 */

async function ensureLoyaltyRow(connection, customerId) {
  const [rows] = await connection.query(
    'SELECT points, wash_stamps FROM loyalty WHERE customer_id = ?',
    [customerId]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  await connection.query(
    'INSERT INTO loyalty (customer_id, points, wash_stamps) VALUES (?, 0, 0)',
    [customerId]
  );

  return { points: 0, wash_stamps: 0 };
}

/**
 * @returns {{ wash_stamps: number, free_wash_earned: boolean }}
 */
async function incrementWashStamp(connection, customerId) {
  const row = await ensureLoyaltyRow(connection, customerId);
  let stamps = Number(row.wash_stamps) || 0;
  let freeWashEarned = false;

  if (stamps >= 5) {
    stamps = 0;
    freeWashEarned = true;
  } else {
    stamps += 1;
  }

  await connection.query('UPDATE loyalty SET wash_stamps = ? WHERE customer_id = ?', [
    stamps,
    customerId,
  ]);

  return { wash_stamps: stamps, free_wash_earned: freeWashEarned };
}

async function getWashStamps(connectionOrPool, customerId) {
  const db = connectionOrPool;
  const [rows] = await db.query(
    'SELECT COALESCE(wash_stamps, 0) AS wash_stamps FROM loyalty WHERE customer_id = ?',
    [customerId]
  );

  if (rows.length === 0) {
    return 0;
  }

  return Number(rows[0].wash_stamps) || 0;
}

module.exports = {
  ensureLoyaltyRow,
  incrementWashStamp,
  getWashStamps,
};
