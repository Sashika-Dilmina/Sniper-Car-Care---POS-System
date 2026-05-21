-- VIP Customer Booking System Migration
USE sniper_car_care;

-- VIP Customers table
CREATE TABLE IF NOT EXISTS vip_customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  vehicle_model VARCHAR(255) NOT NULL,
  vehicle_type ENUM('Saloon', '4x4') NOT NULL,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_phone (phone),
  INDEX idx_vehicle_type (vehicle_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- VIP Bookings table (Appointments)
CREATE TABLE IF NOT EXISTS vip_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vip_customer_id INT NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  assigned_staff_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vip_customer_id) REFERENCES vip_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_appointment_date (appointment_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- VIP Services table (Service offerings)
CREATE TABLE IF NOT EXISTS vip_services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  icon VARCHAR(100),
  features TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default VIP services
INSERT INTO vip_services (name, description, price, icon, features) VALUES
('Interior Deep Clean', 'Complete interior detailing with premium products', 150.00, 'vacuum', 'Deep vacuum, leather conditioning, window cleaning'),
('Paint Protection', 'Professional paint protection and ceramic coating', 250.00, 'shield', 'Scratch protection, UV protection, water beading'),
('Polish & Finishing', 'Paint polishing and professional finishing', 200.00, 'sparkles', 'Swirl mark removal, high gloss finish'),
('Trim Restoration', 'Restore and finish trim pieces', 180.00, 'settings', 'Trim coating, protective sealant'),
('Premium Finishing', 'Complete premium car care package', 400.00, 'crown', 'All services included, 2-day service');
