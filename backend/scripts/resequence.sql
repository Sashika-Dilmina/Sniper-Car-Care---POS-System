SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create backups of affected tables
DROP TABLE IF EXISTS orders_backup_20260903;
CREATE TABLE orders_backup_20260903 AS SELECT * FROM orders;

DROP TABLE IF EXISTS order_items_backup_20260903;
CREATE TABLE order_items_backup_20260903 AS SELECT * FROM order_items;

DROP TABLE IF EXISTS payments_backup_20260903;
CREATE TABLE payments_backup_20260903 AS SELECT * FROM payments;

DROP TABLE IF EXISTS services_backup_20260903;
CREATE TABLE services_backup_20260903 AS SELECT * FROM services;

DROP TABLE IF EXISTS customer_credits_backup_20260903;
CREATE TABLE customer_credits_backup_20260903 AS SELECT * FROM customer_credits;

DROP TABLE IF EXISTS feedback_backup_20260903;
CREATE TABLE feedback_backup_20260903 AS SELECT * FROM feedback;

-- 2. Delete child rows for target orders (1792..1801 and 1813..1814)
DELETE FROM order_items WHERE (order_id BETWEEN 1792 AND 1801) OR order_id IN (1813, 1814);
DELETE FROM payments WHERE (order_id BETWEEN 1792 AND 1801) OR order_id IN (1813, 1814);
DELETE FROM services WHERE (order_id BETWEEN 1792 AND 1801) OR order_id IN (1813, 1814);
DELETE FROM customer_credits WHERE (order_id BETWEEN 1792 AND 1801) OR order_id IN (1813, 1814);
DELETE FROM feedback WHERE (order_id BETWEEN 1792 AND 1801) OR order_id IN (1813, 1814);

-- 3. Delete parent rows in orders
DELETE FROM orders WHERE (id BETWEEN 1792 AND 1801) OR id IN (1813, 1814);

-- 4. Shift 1802..1812 down by 10 (so 1802 becomes 1792, ..., 1812 becomes 1802)
UPDATE order_items SET order_id = order_id - 10 WHERE order_id BETWEEN 1802 AND 1812;
UPDATE payments SET order_id = order_id - 10 WHERE order_id BETWEEN 1802 AND 1812;
UPDATE services SET order_id = order_id - 10 WHERE order_id BETWEEN 1802 AND 1812;
UPDATE customer_credits SET order_id = order_id - 10 WHERE order_id BETWEEN 1802 AND 1812;
UPDATE feedback SET order_id = order_id - 10 WHERE order_id BETWEEN 1802 AND 1812;
UPDATE orders SET id = id - 10 WHERE id BETWEEN 1802 AND 1812 ORDER BY id ASC;

-- 5. Shift >= 1815 down by 12 (so 1815 becomes 1803, 1816 becomes 1804, 1817 becomes 1805, etc.)
UPDATE order_items SET order_id = order_id - 12 WHERE order_id >= 1815;
UPDATE payments SET order_id = order_id - 12 WHERE order_id >= 1815;
UPDATE services SET order_id = order_id - 12 WHERE order_id >= 1815;
UPDATE customer_credits SET order_id = order_id - 12 WHERE order_id >= 1815;
UPDATE feedback SET order_id = order_id - 12 WHERE order_id >= 1815;
UPDATE orders SET id = id - 12 WHERE id >= 1815 ORDER BY id ASC;

SET FOREIGN_KEY_CHECKS = 1;
