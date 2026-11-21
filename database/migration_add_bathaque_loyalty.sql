-- Migration: Add Bathaque ID and Bathaque Loyalty Punch-Card System
USE sniper_car_care;

-- 1. Add bathaque_id to customers table if not exists
SET @exist_bathaque_cust := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'customers' 
    AND COLUMN_NAME = 'bathaque_id'
);

SET @sql_cust := IF(@exist_bathaque_cust = 0, 
  'ALTER TABLE customers ADD COLUMN bathaque_id VARCHAR(50) DEFAULT NULL AFTER phone, ADD INDEX idx_customers_bathaque_id (bathaque_id)', 
  'SELECT "Column bathaque_id already exists in customers"');
PREPARE stmt_cust FROM @sql_cust;
EXECUTE stmt_cust;
DEALLOCATE PREPARE stmt_cust;

-- 2. Add bathaque_id to orders table if not exists
SET @exist_bathaque_orders := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders' 
    AND COLUMN_NAME = 'bathaque_id'
);

SET @sql_orders := IF(@exist_bathaque_orders = 0, 
  'ALTER TABLE orders ADD COLUMN bathaque_id VARCHAR(50) DEFAULT NULL AFTER customer_id, ADD INDEX idx_orders_bathaque_id (bathaque_id)', 
  'SELECT "Column bathaque_id already exists in orders"');
PREPARE stmt_orders FROM @sql_orders;
EXECUTE stmt_orders;
DEALLOCATE PREPARE stmt_orders;

-- 3. Create bathaque_loyalty table for shared punch-card tracking
CREATE TABLE IF NOT EXISTS bathaque_loyalty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bathaque_id VARCHAR(50) UNIQUE NOT NULL,
  wash_stamps INT NOT NULL DEFAULT 0,
  total_washes INT NOT NULL DEFAULT 0,
  free_washes_earned INT NOT NULL DEFAULT 0,
  free_washes_redeemed INT NOT NULL DEFAULT 0,
  last_wash_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bathaque_loyalty_stamps (wash_stamps)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Ensure payment_status enum or column in orders supports 'free'
ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'pending';

-- 5. Ensure payments table method supports 'free'
ALTER TABLE payments MODIFY COLUMN method VARCHAR(50) NOT NULL DEFAULT 'cash';

SELECT 'Bathaque Loyalty Migration Completed Successfully!' AS status;
