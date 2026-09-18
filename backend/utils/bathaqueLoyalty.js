const defaultPool = require('../config/database');

function resolveDbAndId(connOrPool, possibleId) {
  if (typeof connOrPool === 'string') {
    return { connection: defaultPool, cleanId: connOrPool.toString().trim() };
  }
  const cleanId = (possibleId || '').toString().trim();
  return { connection: connOrPool || defaultPool, cleanId };
}

async function ensureBathaqueLoyalty(connOrPool, bathaqueId) {
  const { connection, cleanId } = resolveDbAndId(connOrPool, bathaqueId);
  if (!cleanId) return null;

  const [rows] = await connection.query(
    'SELECT * FROM bathaque_loyalty WHERE bathaque_id = ?',
    [cleanId]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  try {
    await connection.query(
      'INSERT INTO bathaque_loyalty (bathaque_id, wash_stamps, total_washes, free_washes_earned, free_washes_redeemed) VALUES (?, 0, 0, 0, 0)',
      [cleanId]
    );
  } catch (err) {
    if (err.code !== 'ER_DUP_ENTRY') {
      throw err;
    }
  }

  const [createdRows] = await connection.query(
    'SELECT * FROM bathaque_loyalty WHERE bathaque_id = ?',
    [cleanId]
  );

  return createdRows[0] || { bathaque_id: cleanId, wash_stamps: 0, total_washes: 0, free_washes_earned: 0, free_washes_redeemed: 0 };
}

async function getBathaqueLoyalty(connOrPool, bathaqueId) {
  const { connection: db, cleanId } = resolveDbAndId(connOrPool, bathaqueId);
  if (!cleanId) return null;

  const [rows] = await db.query(
    'SELECT * FROM bathaque_loyalty WHERE bathaque_id = ?',
    [cleanId]
  );

  if (rows.length === 0) {
    return {
      bathaque_id: cleanId,
      wash_stamps: 0,
      total_washes: 0,
      free_washes_earned: 0,
      free_washes_redeemed: 0,
      is_free_eligible: false,
      stamps_needed: 5
    };
  }

  const row = rows[0];
  const stamps = Number(row.wash_stamps) || 0;
  return {
    ...row,
    wash_stamps: stamps,
    is_free_eligible: stamps >= 5,
    stamps_needed: Math.max(0, 5 - stamps)
  };
}

async function incrementBathaqueStamp(connOrPool, bathaqueId) {
  const { connection, cleanId } = resolveDbAndId(connOrPool, bathaqueId);
  if (!cleanId) return null;

  await ensureBathaqueLoyalty(connection, cleanId);

  const [rows] = await connection.query(
    'SELECT wash_stamps, total_washes, free_washes_earned FROM bathaque_loyalty WHERE bathaque_id = ? FOR UPDATE',
    [cleanId]
  );

  if (rows.length === 0) return null;

  let stamps = Number(rows[0].wash_stamps) || 0;
  let totalWashes = Number(rows[0].total_washes) || 0;
  let freeEarned = Number(rows[0].free_washes_earned) || 0;
  let freeWashEarnedThisTime = false;

  totalWashes += 1;

  if (stamps < 5) {
    stamps += 1;
    if (stamps === 5) {
      freeEarned += 1;
      freeWashEarnedThisTime = true;
    }
  }

  await connection.query(
    'UPDATE bathaque_loyalty SET wash_stamps = ?, total_washes = ?, free_washes_earned = ?, last_wash_at = CURRENT_TIMESTAMP WHERE bathaque_id = ?',
    [stamps, totalWashes, freeEarned, cleanId]
  );

  return {
    bathaque_id: cleanId,
    wash_stamps: stamps,
    total_washes: totalWashes,
    free_washes_earned: freeEarned,
    free_wash_earned_now: freeWashEarnedThisTime,
    is_free_eligible: stamps >= 5
  };
}

async function redeemBathaqueFreeWash(connOrPool, bathaqueId) {
  const { connection, cleanId } = resolveDbAndId(connOrPool, bathaqueId);
  if (!cleanId) return null;

  await ensureBathaqueLoyalty(connection, cleanId);

  const [rows] = await connection.query(
    'SELECT wash_stamps, total_washes, free_washes_redeemed FROM bathaque_loyalty WHERE bathaque_id = ? FOR UPDATE',
    [cleanId]
  );

  if (rows.length === 0) return null;

  let stamps = Number(rows[0].wash_stamps) || 0;
  let totalWashes = Number(rows[0].total_washes) || 0;
  let redeemed = Number(rows[0].free_washes_redeemed) || 0;

  totalWashes += 1;
  redeemed += 1;
  stamps = 0; // Reset cycle back to 0 for next 5 washes

  await connection.query(
    'UPDATE bathaque_loyalty SET wash_stamps = ?, total_washes = ?, free_washes_redeemed = ?, last_wash_at = CURRENT_TIMESTAMP WHERE bathaque_id = ?',
    [stamps, totalWashes, redeemed, cleanId]
  );

  return {
    bathaque_id: cleanId,
    wash_stamps: stamps,
    total_washes: totalWashes,
    free_washes_redeemed: redeemed,
    is_free_eligible: false
  };
}

module.exports = {
  ensureBathaqueLoyalty,
  getBathaqueLoyalty,
  incrementBathaqueStamp,
  redeemBathaqueFreeWash
};
