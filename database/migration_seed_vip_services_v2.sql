-- Migration to seed standard VIP services and update legacy 0.00 totals
USE sniper_car_care;

INSERT INTO vip_services (name, description, price, icon) 
SELECT * FROM (SELECT 'Saloon VIP Service' AS name, 'Standard Saloon VIP package' AS description, 75.00 AS price, 'crown' AS icon) AS tmp 
WHERE NOT EXISTS (SELECT name FROM vip_services WHERE name = 'Saloon VIP Service') 
LIMIT 1;

INSERT INTO vip_services (name, description, price, icon) 
SELECT * FROM (SELECT '4x4 VIP Service' AS name, 'Standard 4x4 VIP package' AS description, 90.00 AS price, 'crown' AS icon) AS tmp 
WHERE NOT EXISTS (SELECT name FROM vip_services WHERE name = '4x4 VIP Service') 
LIMIT 1;

-- Update existing orders that got 0.00 total during creation
UPDATE orders o 
JOIN vip_bookings vb ON o.vip_booking_id = vb.id 
JOIN vip_services vs ON vb.service_type = vs.name 
SET o.total = vs.price 
WHERE o.total = 0.00 AND o.source = 'vip_booking';
