-- Migration to add purchase_price to products table
USE sniper_car_care;

-- Check if column exists, if not add it
ALTER TABLE products 
ADD COLUMN purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
