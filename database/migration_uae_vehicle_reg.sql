-- Database Migration: UAE Vehicle Registration
USE sniper_car_care;

-- 1. Create PlateCodeMaster Table
CREATE TABLE IF NOT EXISTS PlateCodeMaster (
  Id INT PRIMARY KEY AUTO_INCREMENT,
  EmirateId INT NOT NULL,
  EmirateName VARCHAR(100) NOT NULL,
  PlateCode VARCHAR(50) NOT NULL,
  Status VARCHAR(50) DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Create vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  VehicleId INT PRIMARY KEY AUTO_INCREMENT,
  CustomerId INT NOT NULL,
  Emirate VARCHAR(100) NOT NULL,
  PlateCode VARCHAR(50) NOT NULL,
  PlateNumber VARCHAR(50) NOT NULL,
  VehicleRegistrationNumber VARCHAR(255) UNIQUE NOT NULL,
  CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CreatedBy VARCHAR(255) NULL,
  FOREIGN KEY (CustomerId) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Seed Emirates & Plate Codes to PlateCodeMaster
INSERT INTO PlateCodeMaster (EmirateId, EmirateName, PlateCode) VALUES
-- Dubai (A-Z)
(2, 'Dubai', 'A'), (2, 'Dubai', 'B'), (2, 'Dubai', 'C'), (2, 'Dubai', 'D'), (2, 'Dubai', 'E'),
(2, 'Dubai', 'F'), (2, 'Dubai', 'G'), (2, 'Dubai', 'H'), (2, 'Dubai', 'I'), (2, 'Dubai', 'J'),
(2, 'Dubai', 'K'), (2, 'Dubai', 'L'), (2, 'Dubai', 'M'), (2, 'Dubai', 'N'), (2, 'Dubai', 'O'),
(2, 'Dubai', 'P'), (2, 'Dubai', 'Q'), (2, 'Dubai', 'R'), (2, 'Dubai', 'S'), (2, 'Dubai', 'T'),
(2, 'Dubai', 'U'), (2, 'Dubai', 'V'), (2, 'Dubai', 'W'), (2, 'Dubai', 'X'), (2, 'Dubai', 'Y'),
(2, 'Dubai', 'Z'),

-- Abu Dhabi (1-18, 50)
(1, 'Abu Dhabi', '1'), (1, 'Abu Dhabi', '2'), (1, 'Abu Dhabi', '3'), (1, 'Abu Dhabi', '4'), (1, 'Abu Dhabi', '5'),
(1, 'Abu Dhabi', '6'), (1, 'Abu Dhabi', '7'), (1, 'Abu Dhabi', '8'), (1, 'Abu Dhabi', '9'), (1, 'Abu Dhabi', '10'),
(1, 'Abu Dhabi', '11'), (1, 'Abu Dhabi', '12'), (1, 'Abu Dhabi', '13'), (1, 'Abu Dhabi', '14'), (1, 'Abu Dhabi', '15'),
(1, 'Abu Dhabi', '16'), (1, 'Abu Dhabi', '17'), (1, 'Abu Dhabi', '18'), (1, 'Abu Dhabi', '50'),

-- Sharjah (1, 2, 3, A, B, C)
(3, 'Sharjah', '1'), (3, 'Sharjah', '2'), (3, 'Sharjah', '3'),
(3, 'Sharjah', 'A'), (3, 'Sharjah', 'B'), (3, 'Sharjah', 'C'),

-- Ajman (A, B, C, D, E, H)
(4, 'Ajman', 'A'), (4, 'Ajman', 'B'), (4, 'Ajman', 'C'), (4, 'Ajman', 'D'), (4, 'Ajman', 'E'), (4, 'Ajman', 'H'),

-- Umm Al Quwain (A-E)
(5, 'Umm Al Quwain', 'A'), (5, 'Umm Al Quwain', 'B'), (5, 'Umm Al Quwain', 'C'), (5, 'Umm Al Quwain', 'D'), (5, 'Umm Al Quwain', 'E'),

-- Ras Al Khaimah (A, B, C, D, E, I, N, S, V, Y)
(6, 'Ras Al Khaimah', 'A'), (6, 'Ras Al Khaimah', 'B'), (6, 'Ras Al Khaimah', 'C'), (6, 'Ras Al Khaimah', 'D'), (6, 'Ras Al Khaimah', 'E'),
(6, 'Ras Al Khaimah', 'I'), (6, 'Ras Al Khaimah', 'N'), (6, 'Ras Al Khaimah', 'S'), (6, 'Ras Al Khaimah', 'V'), (6, 'Ras Al Khaimah', 'Y'),

-- Fujairah (A-E)
(7, 'Fujairah', 'A'), (7, 'Fujairah', 'B'), (7, 'Fujairah', 'C'), (7, 'Fujairah', 'D'), (7, 'Fujairah', 'E');

-- 4. Create index on vehicles for faster search
CREATE INDEX idx_vehicle_reg_num ON vehicles(VehicleRegistrationNumber);
CREATE INDEX idx_vehicle_customer ON vehicles(CustomerId);

-- 5. Modify customers table vehicle_plate column length to support longer plate formats (up to 100 chars)
ALTER TABLE customers MODIFY vehicle_plate VARCHAR(100) NOT NULL;

