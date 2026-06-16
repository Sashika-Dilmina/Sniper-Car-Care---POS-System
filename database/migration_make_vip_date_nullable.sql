-- Migration to make appointment_date and appointment_time nullable in vip_bookings table
USE sniper_car_care;

ALTER TABLE vip_bookings MODIFY COLUMN appointment_date DATE NULL;
ALTER TABLE vip_bookings MODIFY COLUMN appointment_time TIME NULL;
