-- Migration: Cleanup duplicate/overpaid payment records from historical split and credit orders
-- Date: 2026-09-23

-- 1. Order 2049: Adjust credit placeholder row from 15.00 to 14.00 (since 1.00 AED was paid via card, remaining is 14.00)
UPDATE payments SET amount = 14.00 WHERE id = 2081 AND order_id = 2049;

-- 2. Delete duplicate/stale placeholder payments for orders that were fully recovered or double-submitted
-- Order 1967: Row 2008 (credit 25.00 was fully recovered by card row 2041)
-- Order 1911: Row 1947 (credit 20.00 was fully recovered by card row 1954)
-- Order 1870: Row 1921 (credit 95.00 was fully recovered by card row 1931)
-- Order 1817: Row 1892 (credit 20.00 was fully recovered by card row 2112)
-- Order 1816: Row 1856 (stale bank_transfer 25.00 placeholder, recovered by card row 1885)
-- Order 1632: Row 1648 (duplicate card click 3 mins after row 1647)
-- Order 1553: Row 1555 (stale bank_transfer 20.00 placeholder, recovered by card row 1556)
-- Order 1361: Row 1358 (stale bank_transfer 20.00 placeholder, recovered by card row 1741)
-- Order 1335: Row 1338 (stale bank_transfer 20.00 placeholder, recovered by card row 1430)
-- Order 1290: Row 1283 (stale bank_transfer 25.00 placeholder, recovered by cash row 1605)
-- Order 1283: Row 1281 (stale bank_transfer 25.00 placeholder, recovered by cash row 1604)
-- Order 1254: Row 1247 (stale bank_transfer 25.00 placeholder, recovered by card row 1742)
-- Order 1101: Row 1100 (stale bank_transfer 25.00 placeholder, recovered by cash row 1603)
-- Order 1099: Row 1096 (stale bank_transfer 20.00 placeholder, recovered by card row 1743)
-- Order 781:  Row 782  (duplicate card 10.00, customer completed via Apple Pay row 783)
-- Order 694:  Row 673  (duplicate card click 2 seconds after row 672)
-- Order 576:  Row 557  (duplicate card click 3 seconds after row 556)
DELETE FROM payments WHERE id IN (
  2008, 1947, 1921, 1892, 1856, 1648, 1555, 1358, 1338, 1283, 1281, 1247, 1100, 1096, 782, 673, 557
);
