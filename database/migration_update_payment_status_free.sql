-- Migration: Add 'free' to payment_status ENUM in orders table
ALTER TABLE orders MODIFY COLUMN payment_status ENUM('pending', 'partial', 'paid', 'refunded', 'free') DEFAULT 'pending';
