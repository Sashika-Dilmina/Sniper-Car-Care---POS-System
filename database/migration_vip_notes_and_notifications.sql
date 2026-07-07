-- Database schema updates for VIP notes and notifications
USE sniper_car_care;

-- 1. Create customer notifications table
CREATE TABLE IF NOT EXISTS customer_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_plate VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vehicle_plate (vehicle_plate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Add staff_notes to vip_bookings
ALTER TABLE vip_bookings ADD COLUMN staff_notes TEXT NULL;
