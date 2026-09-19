-- Migration: Allow credit as payment_status in orders table
ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
