-- Database Migration: UAE Plate Codes Seed v4
USE sniper_car_care;

-- 1. Wipe current plate codes
DELETE FROM PlateCodeMaster;

-- 2. Seed Emirates & corrected Plate Codes to PlateCodeMaster
INSERT INTO PlateCodeMaster (EmirateId, EmirateName, PlateCode) VALUES
-- Dubai (Id = 2)
(2, 'Dubai', 'A'), (2, 'Dubai', 'B'), (2, 'Dubai', 'C'), (2, 'Dubai', 'D'), (2, 'Dubai', 'E'), 
(2, 'Dubai', 'F'), (2, 'Dubai', 'G'), (2, 'Dubai', 'H'), (2, 'Dubai', 'I'), (2, 'Dubai', 'J'), 
(2, 'Dubai', 'K'), (2, 'Dubai', 'L'), (2, 'Dubai', 'M'), (2, 'Dubai', 'N'), (2, 'Dubai', 'O'), 
(2, 'Dubai', 'P'), (2, 'Dubai', 'Q'), (2, 'Dubai', 'R'), (2, 'Dubai', 'S'), (2, 'Dubai', 'T'), 
(2, 'Dubai', 'U'), (2, 'Dubai', 'V'), (2, 'Dubai', 'W'), (2, 'Dubai', 'X'), (2, 'Dubai', 'Y'), 
(2, 'Dubai', 'Z'), 
(2, 'Dubai', 'AA'), (2, 'Dubai', 'BB'), (2, 'Dubai', 'CC'), (2, 'Dubai', 'DD'), (2, 'Dubai', 'EE'), 
(2, 'Dubai', 'FF'), (2, 'Dubai', 'HH'), (2, 'Dubai', 'II'), (2, 'Dubai', 'MM'), (2, 'Dubai', 'NN'), 
(2, 'Dubai', 'Classic'), (2, 'Dubai', 'Code 9'), 
(2, 'Dubai', 'Motorcycle 1'), (2, 'Dubai', 'Motorcycle 2'), (2, 'Dubai', 'Motorcycle 3'), 
(2, 'Dubai', 'White'),

-- Abu Dhabi (Id = 1)
(1, 'Abu Dhabi', '1'), (1, 'Abu Dhabi', '2'), (1, 'Abu Dhabi', '3'), (1, 'Abu Dhabi', '4'), (1, 'Abu Dhabi', '5'), 
(1, 'Abu Dhabi', '6'), (1, 'Abu Dhabi', '7'), (1, 'Abu Dhabi', '8'), (1, 'Abu Dhabi', '9'), (1, 'Abu Dhabi', '10'), 
(1, 'Abu Dhabi', '11'), (1, 'Abu Dhabi', '12'), (1, 'Abu Dhabi', '13'), (1, 'Abu Dhabi', '14'), (1, 'Abu Dhabi', '15'), 
(1, 'Abu Dhabi', '16'), (1, 'Abu Dhabi', '17'), (1, 'Abu Dhabi', '18'), (1, 'Abu Dhabi', '19'), (1, 'Abu Dhabi', '20'), 
(1, 'Abu Dhabi', '21'), (1, 'Abu Dhabi', '22'), (1, 'Abu Dhabi', '23'), (1, 'Abu Dhabi', '50'), 
(1, 'Abu Dhabi', 'Diplomatic'), (1, 'Abu Dhabi', 'Grey'), (1, 'Abu Dhabi', 'Red'), (1, 'Abu Dhabi', 'White'),

-- Sharjah (Id = 3)
(3, 'Sharjah', '1'), (3, 'Sharjah', '2'), (3, 'Sharjah', '3'), (3, 'Sharjah', '4'), (3, 'Sharjah', '5'), 
(3, 'Sharjah', '6'), (3, 'Sharjah', '7'), (3, 'Sharjah', '8'), (3, 'Sharjah', '9'), (3, 'Sharjah', '10'), 
(3, 'Sharjah', 'Classic'), (3, 'Sharjah', 'White'),

-- Ajman (Id = 4)
(4, 'Ajman', 'A'), (4, 'Ajman', 'B'), (4, 'Ajman', 'C'), (4, 'Ajman', 'D'), (4, 'Ajman', 'E'), 
(4, 'Ajman', 'F'), (4, 'Ajman', 'G'), (4, 'Ajman', 'H'), (4, 'Ajman', 'I'), (4, 'Ajman', 'J'), 
(4, 'Ajman', 'K'), (4, 'Ajman', 'L'), (4, 'Ajman', 'M'), (4, 'Ajman', 'N'), (4, 'Ajman', 'O'), 
(4, 'Ajman', 'P'), (4, 'Ajman', 'Q'), (4, 'Ajman', 'R'), (4, 'Ajman', 'S'), (4, 'Ajman', 'T'), 
(4, 'Ajman', 'U'), (4, 'Ajman', 'V'), (4, 'Ajman', 'W'), (4, 'Ajman', 'X'), (4, 'Ajman', 'Y'), 
(4, 'Ajman', 'Z'), (4, 'Ajman', 'Classic'), (4, 'Ajman', 'White'),

-- Umm Al Quwain (Id = 5)
(5, 'Umm Al Quwain', 'A'), (5, 'Umm Al Quwain', 'B'), (5, 'Umm Al Quwain', 'C'), (5, 'Umm Al Quwain', 'D'), (5, 'Umm Al Quwain', 'E'), 
(5, 'Umm Al Quwain', 'F'), (5, 'Umm Al Quwain', 'G'), (5, 'Umm Al Quwain', 'H'), (5, 'Umm Al Quwain', 'I'), (5, 'Umm Al Quwain', 'J'), 
(5, 'Umm Al Quwain', 'K'), (5, 'Umm Al Quwain', 'L'), (5, 'Umm Al Quwain', 'M'), (5, 'Umm Al Quwain', 'N'), (5, 'Umm Al Quwain', 'O'), 
(5, 'Umm Al Quwain', 'P'), (5, 'Umm Al Quwain', 'Q'), (5, 'Umm Al Quwain', 'R'), (5, 'Umm Al Quwain', 'S'), (5, 'Umm Al Quwain', 'T'), 
(5, 'Umm Al Quwain', 'U'), (5, 'Umm Al Quwain', 'V'), (5, 'Umm Al Quwain', 'W'), (5, 'Umm Al Quwain', 'X'), (5, 'Umm Al Quwain', 'Y'), 
(5, 'Umm Al Quwain', 'Z'), (5, 'Umm Al Quwain', 'UA'), (5, 'Umm Al Quwain', 'White'),

-- Ras Al Khaimah (Id = 6)
(6, 'Ras Al Khaimah', '4'), 
(6, 'Ras Al Khaimah', 'A'), (6, 'Ras Al Khaimah', 'B'), (6, 'Ras Al Khaimah', 'C'), (6, 'Ras Al Khaimah', 'D'), (6, 'Ras Al Khaimah', 'E'), 
(6, 'Ras Al Khaimah', 'F'), (6, 'Ras Al Khaimah', 'G'), (6, 'Ras Al Khaimah', 'H'), (6, 'Ras Al Khaimah', 'I'), (6, 'Ras Al Khaimah', 'J'), 
(6, 'Ras Al Khaimah', 'K'), (6, 'Ras Al Khaimah', 'L'), (6, 'Ras Al Khaimah', 'M'), (6, 'Ras Al Khaimah', 'N'), (6, 'Ras Al Khaimah', 'O'), 
(6, 'Ras Al Khaimah', 'P'), (6, 'Ras Al Khaimah', 'Q'), (6, 'Ras Al Khaimah', 'R'), (6, 'Ras Al Khaimah', 'S'), (6, 'Ras Al Khaimah', 'T'), 
(6, 'Ras Al Khaimah', 'U'), (6, 'Ras Al Khaimah', 'V'), (6, 'Ras Al Khaimah', 'W'), (6, 'Ras Al Khaimah', 'X'), (6, 'Ras Al Khaimah', 'Y'), 
(6, 'Ras Al Khaimah', 'Z'), (6, 'Ras Al Khaimah', 'Classic'), (6, 'Ras Al Khaimah', 'The Tower'), (6, 'Ras Al Khaimah', 'White'),

-- Fujairah (Id = 7)
(7, 'Fujairah', 'A'), (7, 'Fujairah', 'B'), (7, 'Fujairah', 'C'), (7, 'Fujairah', 'D'), (7, 'Fujairah', 'E'), 
(7, 'Fujairah', 'F'), (7, 'Fujairah', 'G'), (7, 'Fujairah', 'H'), (7, 'Fujairah', 'I'), (7, 'Fujairah', 'J'), 
(7, 'Fujairah', 'K'), (7, 'Fujairah', 'L'), (7, 'Fujairah', 'M'), (7, 'Fujairah', 'N'), (7, 'Fujairah', 'O'), 
(7, 'Fujairah', 'P'), (7, 'Fujairah', 'Q'), (7, 'Fujairah', 'R'), (7, 'Fujairah', 'S'), (7, 'Fujairah', 'T'), 
(7, 'Fujairah', 'U'), (7, 'Fujairah', 'V'), (7, 'Fujairah', 'W'), (7, 'Fujairah', 'X'), (7, 'Fujairah', 'Y'), 
(7, 'Fujairah', 'Z'), (7, 'Fujairah', 'White');
