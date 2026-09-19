-- Migration: Add 'cancelled' to payment_status ENUM in orders table
USE sniper_car_care;
ALTER TABLE orders MODIFY COLUMN payment_status ENUM('pending', 'partial', 'paid', 'refunded', 'free', 'cancelled') DEFAULT 'pending';
