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

async function awardLoyaltyStampsForOrder(connOrPool, orderId) {
  const { connection } = resolveDbAndId(connOrPool);
  if (!orderId) return;

  try {
    const [orders] = await connection.query(
      `SELECT o.*, c.bathaque_id as cust_bathaque_id, c.emirate as cust_emirate
       FROM orders o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       WHERE o.id = ?`,
      [orderId]
    );
    if (orders.length === 0) return;
    const order = orders[0];

    // Check if order was already stamped
    if (order.loyalty_stamped) {
      return;
    }

    const targetBathaqueId = order.bathaque_id || order.cust_bathaque_id;
    const targetCustomerId = order.customer_id || order.customer_id_ref;
    const emirate = order.emirate || order.cust_emirate;

    // 1. If order was marked as free wash, redeem/reset Bathaque loyalty
    if ((order.payment_status === 'free' || parseFloat(order.total) === 0) && targetBathaqueId) {
      await redeemBathaqueFreeWash(connection, targetBathaqueId);
      await connection.query('UPDATE orders SET loyalty_stamped = 1 WHERE id = ?', [orderId]);
      return;
    }

    // 2. If order has eligible service and total > 0 (paid wash), increment stamp!
    if (parseFloat(order.total) > 0) {
      const [servicesList] = await connection.query(
        'SELECT service_name FROM services WHERE order_id = ?',
        [orderId]
      );
      const [itemsList] = await connection.query(
        'SELECT p.name, p.category FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
        [orderId]
      );

      const eligibleFreeServices = [
        'full body service',
        'full body wash',
        'ceramic wash',
        'double soap',
        'body wash'
      ];

      let hasEligibleService = false;

      for (let s of servicesList) {
        const sName = (s.service_name || '').toLowerCase().trim();
        if (eligibleFreeServices.some(e => sName.includes(e)) || sName.includes('vip') || sName.includes('wash')) {
          hasEligibleService = true;
          break;
        }
      }

      if (!hasEligibleService) {
        for (let item of itemsList) {
          const pName = (item.name || '').toLowerCase().trim();
          const cat = (item.category || '').toLowerCase().trim();
          if (eligibleFreeServices.some(e => pName.includes(e)) || cat === 'vip' || pName.includes('vip') || cat.includes('service') || pName.includes('wash')) {
            hasEligibleService = true;
            break;
          }
        }
      }

      if (hasEligibleService) {
        const isExemptEmirate = emirate === 'Garage' || emirate === 'Sniper car care';
        if (!isExemptEmirate) {
          if (targetBathaqueId) {
            await incrementBathaqueStamp(connection, targetBathaqueId);
          }
          if (targetCustomerId) {
            try {
              const { ensureLoyaltyRow, incrementWashStamp } = require('./loyaltyStamps');
              await ensureLoyaltyRow(connection, targetCustomerId);
              await incrementWashStamp(connection, targetCustomerId);
            } catch (lErr) {
              console.error('[Loyalty] Error incrementing loyalty stamp:', lErr.message);
            }
          }
        }
        await connection.query('UPDATE orders SET loyalty_stamped = 1 WHERE id = ?', [orderId]);
      }
    }
  } catch (err) {
    console.error('[Bathaque] Error awarding loyalty stamps for order:', err.message);
  }
}

module.exports = {
  ensureBathaqueLoyalty,
  getBathaqueLoyalty,
  incrementBathaqueStamp,
  redeemBathaqueFreeWash,
  awardLoyaltyStampsForOrder
};
