-- Migration: Delete orders 900 & 901 permanently and update payment status for orders 639, 658, 659, 670, 692, 775 to 'paid'
USE sniper_car_care;

-- 1. Permanently delete Order 900 and 901
DELETE FROM order_items WHERE order_id IN (900, 901);
DELETE FROM payments WHERE order_id IN (900, 901);
DELETE FROM services WHERE order_id IN (900, 901);
DELETE FROM credit_payments WHERE credit_id IN (SELECT id FROM customer_credits WHERE order_id IN (900, 901));
DELETE FROM customer_credits WHERE order_id IN (900, 901);
DELETE FROM feedback WHERE order_id IN (900, 901);
DELETE FROM orders WHERE id IN (900, 901);

-- 2. Update payment status to 'paid' for orders 639, 658, 659, 670, 692, 775
UPDATE orders SET payment_status = 'paid' WHERE id IN (639, 658, 659, 670, 692, 775);

-- 3. Ensure payments table reflects completed status for these orders
UPDATE payments SET status = 'completed' WHERE order_id IN (639, 658, 659, 670, 692, 775);

-- Insert payment record for any of these orders that do not already have a payment record
INSERT INTO payments (order_id, amount, method, status)
SELECT o.id, o.total, 'cash', 'completed'
FROM orders o
LEFT JOIN payments p ON o.id = p.order_id
WHERE o.id IN (639, 658, 659, 670, 692, 775) AND p.id IS NULL;
