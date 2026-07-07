-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  business_name VARCHAR(100) NULL,
  phone VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL, -- e.g. chemicals, tools, products, marketing
  email VARCHAR(100) NULL,
  address TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_id INT NULL,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL, -- e.g. Service, Product, Equipment, Other
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  payment_status ENUM('paid', 'pending', 'partial') DEFAULT 'paid',
  payment_method ENUM('cash', 'card', 'credit') DEFAULT 'cash',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL, -- e.g. Rent, Salaries, Utilities, Marketing, Other
  amount DECIMAL(10, 2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method ENUM('cash', 'card', 'credit') DEFAULT 'cash',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create customer_credits table
CREATE TABLE IF NOT EXISTS customer_credits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  order_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  remaining_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('unpaid', 'partially_paid', 'fully_paid') DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create credit_payments table
CREATE TABLE IF NOT EXISTS credit_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  credit_id INT NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method ENUM('cash', 'card') DEFAULT 'cash',
  notes TEXT NULL,
  FOREIGN KEY (credit_id) REFERENCES customer_credits(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert VIP services into products table if they do not exist
INSERT INTO products (name, description, category, price, stock, vehicle_type)
SELECT 'Saloon VIP Service', 'Standard Saloon VIP package', 'Services', 75.00, 0, 'Saloon'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Saloon VIP Service' AND vehicle_type = 'Saloon');

INSERT INTO products (name, description, category, price, stock, vehicle_type)
SELECT '4x4 VIP Service', 'Standard 4x4 VIP package', 'Services', 90.00, 0, '4x4'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '4x4 VIP Service' AND vehicle_type = '4x4');
