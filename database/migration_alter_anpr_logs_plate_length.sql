-- Database Migration: Alter ANPR Logs Plate Number Length to support longer/noisy OCR plate detections
USE sniper_car_care;

ALTER TABLE anpr_logs MODIFY plate_number VARCHAR(100) NOT NULL;
