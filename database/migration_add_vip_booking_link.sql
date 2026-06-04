-- Add vip_booking_id link to orders
USE sniper_car_care;

ALTER TABLE orders ADD COLUMN vip_booking_id INT NULL;
ALTER TABLE orders ADD CONSTRAINT fk_orders_vip_booking FOREIGN KEY (vip_booking_id) REFERENCES vip_bookings(id) ON DELETE SET NULL;
