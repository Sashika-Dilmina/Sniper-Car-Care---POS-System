-- Migration to update payment methods in payments table to VARCHAR
-- This supports custom methods like apple_pay, samsung_pay, cash, card, bank_transfer dynamically.

USE sniper_car_care;

-- Temporarily disable safe update mode
SET SQL_SAFE_UPDATES = 0;

-- Update the payments table column type
ALTER TABLE payments 
MODIFY COLUMN method VARCHAR(50) NOT NULL DEFAULT 'cash';

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

SELECT 'Payment methods migration to VARCHAR(50) completed successfully!' as message;
