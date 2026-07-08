-- Migration to sync products list, names, and images from local database changes
USE sniper_car_care;

-- Update Saloon Services Images
UPDATE products SET image_url = '/uploads/service_1783492722998_659256667.png' WHERE category = 'Services' AND vehicle_type = 'Saloon' AND name = 'Full Body Service';
UPDATE products SET image_url = '/uploads/media__1783438703902.png' WHERE category = 'Services' AND vehicle_type = 'Saloon' AND name = 'Double Soap';
UPDATE products SET image_url = '/uploads/media__1783438704166.png' WHERE category = 'Services' AND vehicle_type = 'Saloon' AND name = 'Ceramic Wash';
UPDATE products SET image_url = '/uploads/media__1783438704077.png' WHERE category = 'Services' AND vehicle_type = 'Saloon' AND name = 'Body Wash';
UPDATE products SET image_url = '/uploads/media__1783438703866.png' WHERE category = 'Services' AND vehicle_type = 'Saloon' AND name = 'Just Water';

-- Update 4x4 Services Names and Images
-- First, rename 'Full Body Service' to 'Full Body Wash' for 4x4 if exists
UPDATE products SET name = 'Full Body Wash' WHERE category = 'Services' AND vehicle_type = '4x4' AND name = 'Full Body Service';

-- Update 4x4 Services Images
UPDATE products SET image_url = '/uploads/service_1783495665739_820611802.png' WHERE category = 'Services' AND vehicle_type = '4x4' AND name = 'Full Body Wash';
UPDATE products SET image_url = '/uploads/service_1783496018796_517543863.png' WHERE category = 'Services' AND vehicle_type = '4x4' AND name = 'Body Wash';
UPDATE products SET image_url = '/uploads/service_1783496700443_772827208.png' WHERE category = 'Services' AND vehicle_type = '4x4' AND name = 'Just Water';
UPDATE products SET image_url = '/uploads/service_1783496782737_538847036.png' WHERE category = 'Services' AND vehicle_type = '4x4' AND name = 'Ceramic Wash';
UPDATE products SET image_url = '/uploads/service_1783496804461_786285194.png' WHERE category = 'Services' AND vehicle_type = '4x4' AND name = 'Double Soap';

-- Insert or update test/custom items from local DB if they don't exist
INSERT INTO products (name, category, price, stock, vehicle_type, image_url) 
SELECT * FROM (SELECT 'test' AS name, 'Accessories' AS category, 600.00 AS price, 10 AS stock, 'Both' AS vehicle_type, '/uploads/service_1783437026396_92471711.png' AS image_url) AS tmp 
WHERE NOT EXISTS (SELECT name FROM products WHERE name = 'test') 
LIMIT 1;

INSERT INTO products (name, category, price, stock, vehicle_type, image_url) 
SELECT * FROM (SELECT 'Test Freshner' AS name, 'Car Freshner' AS category, 15.00 AS price, 10 AS stock, 'Both' AS vehicle_type, NULL AS image_url) AS tmp 
WHERE NOT EXISTS (SELECT name FROM products WHERE name = 'Test Freshner') 
LIMIT 1;

INSERT INTO products (name, category, price, stock, vehicle_type, image_url) 
SELECT * FROM (SELECT 'test 2' AS name, 'Car Freshner' AS category, 600.00 AS price, 10 AS stock, 'Both' AS vehicle_type, '/uploads/service_1783437561084_254295565.png' AS image_url) AS tmp 
WHERE NOT EXISTS (SELECT name FROM products WHERE name = 'test 2') 
LIMIT 1;
