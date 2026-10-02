-- Add is_credit_recovery column to payments table
USE sniper_car_care;

SET @dbname = DATABASE();
SET @tablename = "payments";
SET @columnname = "is_credit_recovery";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TINYINT(1) NOT NULL DEFAULT 0")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Backfill historical credit recovery records into payments
UPDATE payments p
JOIN customer_credits cc ON p.order_id = cc.order_id
JOIN credit_payments cp ON cp.credit_id = cc.id 
  AND cp.amount_paid = p.amount 
  AND cp.payment_method = p.method 
  AND ABS(TIMESTAMPDIFF(SECOND, cp.payment_date, p.created_at)) <= 15
SET p.is_credit_recovery = 1;
