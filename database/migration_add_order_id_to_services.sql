-- Migration to add order_id to services table to link service tasks back to POS orders
USE sniper_car_care;

ALTER TABLE services ADD COLUMN order_id INT NULL;
ALTER TABLE services ADD CONSTRAINT fk_services_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

SELECT 'Services order_id link migration completed successfully!' as message;
