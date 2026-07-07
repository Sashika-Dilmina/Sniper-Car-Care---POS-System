-- Loyalty stamp card: 5 washes then 6th free (website purchases)
ALTER TABLE loyalty
  ADD COLUMN wash_stamps INT NOT NULL DEFAULT 0 AFTER points;
