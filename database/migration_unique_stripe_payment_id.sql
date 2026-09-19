-- Database migration to add unique constraint on stripe_payment_id column
-- to prevent race conditions inserting duplicate payments for a single transaction.

USE sniper_car_care;

ALTER TABLE payments ADD UNIQUE KEY idx_stripe_payment_id (stripe_payment_id);
