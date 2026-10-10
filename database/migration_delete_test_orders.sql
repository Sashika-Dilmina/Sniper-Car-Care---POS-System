-- Permanently delete test orders: 533, 542, 543, 546, 548, 549, 550
DELETE FROM services WHERE order_id IN (533, 542, 543, 546, 548, 549, 550);
DELETE FROM order_items WHERE order_id IN (533, 542, 543, 546, 548, 549, 550);
DELETE FROM payments WHERE order_id IN (533, 542, 543, 546, 548, 549, 550);
DELETE FROM customer_credits WHERE order_id IN (533, 542, 543, 546, 548, 549, 550);
DELETE FROM orders WHERE id IN (533, 542, 543, 546, 548, 549, 550);

-- Clean up duplicate payment records for Order ID 537 (keep the earliest payment id, delete duplicates)
DELETE p1 FROM payments p1
INNER JOIN payments p2 
ON p1.order_id = p2.order_id 
AND p1.method = p2.method 
AND p1.amount = p2.amount 
AND p1.id > p2.id;

-- Clean up historical duplicate orders created on 2026-07-16 with exact same customer, total, and created_at timestamp
DELETE o1 FROM orders o1
INNER JOIN orders o2 
ON o1.customer_id = o2.customer_id 
AND o1.total = o2.total 
AND o1.created_at = o2.created_at 
AND o1.id > o2.id;
