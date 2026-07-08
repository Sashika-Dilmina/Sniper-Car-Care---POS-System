-- Migration to update VIP service pricing requested by the user
USE sniper_car_care;

UPDATE vip_services SET price = 95.00 WHERE name = 'Saloon VIP Service';
UPDATE vip_services SET price = 115.00 WHERE name = '4x4 VIP Service';
