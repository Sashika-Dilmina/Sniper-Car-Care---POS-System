-- High-Performance Database Indexes for Sniper POS & Customer Websites
USE sniper_car_care;

-- 1. Indexing customers table for instant lookup by phone, vehicle_plate, created_at, vehicle_type
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
DELIMITER //
CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN indexColumns VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
          AND table_name = tableName 
          AND index_name = indexName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD INDEX ', indexName, ' (', indexColumns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Apply Indexes Safely
CALL AddIndexIfNotExists('customers', 'idx_cust_phone', 'phone');
CALL AddIndexIfNotExists('customers', 'idx_cust_created', 'created_at');
CALL AddIndexIfNotExists('customers', 'idx_cust_vtype', 'vehicle_type');
CALL AddIndexIfNotExists('customers', 'idx_cust_plate_vtype', 'vehicle_plate, vehicle_type');

CALL AddIndexIfNotExists('vehicles', 'idx_veh_platenum_code', 'PlateNumber, PlateCode');
CALL AddIndexIfNotExists('vehicles', 'idx_veh_platenum', 'PlateNumber');

CALL AddIndexIfNotExists('orders', 'idx_orders_customer_created', 'customer_id, created_at');
CALL AddIndexIfNotExists('orders', 'idx_orders_created', 'created_at');
CALL AddIndexIfNotExists('orders', 'idx_orders_status_created', 'status, created_at');
CALL AddIndexIfNotExists('orders', 'idx_orders_payment_created', 'payment_status, created_at');
CALL AddIndexIfNotExists('orders', 'idx_orders_source', 'source');

CALL AddIndexIfNotExists('payments', 'idx_payments_order_status', 'order_id, status');
CALL AddIndexIfNotExists('payments', 'idx_payments_created', 'created_at');
CALL AddIndexIfNotExists('payments', 'idx_payments_method', 'method');

CALL AddIndexIfNotExists('services', 'idx_services_cust_status', 'customer_id, status');
CALL AddIndexIfNotExists('services', 'idx_services_status_created', 'status, created_at');
CALL AddIndexIfNotExists('services', 'idx_services_created', 'created_at');

CALL AddIndexIfNotExists('order_items', 'idx_order_items_product', 'product_id');

CALL AddIndexIfNotExists('products', 'idx_products_stock_vtype', 'stock, vehicle_type');
CALL AddIndexIfNotExists('products', 'idx_products_cat_vtype', 'category, vehicle_type');

-- Cleanup Helper Procedure
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
