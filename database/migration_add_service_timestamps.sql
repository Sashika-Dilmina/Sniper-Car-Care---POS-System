-- Migration to add service_started_at and service_completed_at to orders table
-- This allows precise service time calculations from the dashboard clicks.

USE sniper_car_care;

-- Alter orders table to add columns
ALTER TABLE orders 
ADD COLUMN service_started_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN service_completed_at TIMESTAMP NULL DEFAULT NULL;

SELECT 'Service timestamps migration completed successfully!' as message;
