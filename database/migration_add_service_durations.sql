-- Migration: Add started_at and completed_at columns to services table to track service durations.
USE sniper_car_care;

ALTER TABLE services 
ADD COLUMN started_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL;
