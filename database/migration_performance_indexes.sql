-- Performance Optimization Indexes for Sniper POS
ALTER TABLE orders ADD INDEX idx_orders_created_status (created_at, status, payment_status);
ALTER TABLE payments ADD INDEX idx_payments_created_status_method (created_at, status, method);
ALTER TABLE order_items ADD INDEX idx_order_items_order_product (order_id, product_id);
ALTER TABLE services ADD INDEX idx_services_order_status_created (order_id, status, created_at);
ALTER TABLE customer_credits ADD INDEX idx_customer_credits_order (order_id);
