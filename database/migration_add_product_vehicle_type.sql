-- Migration: Add vehicle_type to products table
USE sniper_car_care;

ALTER TABLE products 
ADD COLUMN vehicle_type ENUM('Saloon', '4x4', 'Both') DEFAULT 'Both';
