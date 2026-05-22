-- migrations/003_seed_blackcreek.sql
-- Black Creek Barber — corrected seed, no staff manipulation

-- Clear default seed data (no FK issues on these)
DELETE FROM availability;
DELETE FROM services;

-- Update existing staff row
UPDATE staff SET name = 'Black Creek Barber', bio = 'Owner & head barber' WHERE id = 1;

-- ─── Services ─────────────────────────────────────────────────────────────
INSERT INTO services (name, duration, price, active, sort_order) VALUES
  ('Haircut',                          30,  3000, 1,  1),
  ('Skin Fade',                        30,  3500, 1,  2),
  ('Buzz Cut',                         30,  2000, 1,  3),
  ('Beard Trim',                       30,  2000, 1,  4),
  ('Haircut & Beard',                  30,  3500, 1,  5),
  ('Straight Razor Shave',             60,  4000, 1,  6),
  ('Half Straight Razor Shave',        60,  3000, 1,  7),
  ('Haircut & Straight Razor Shave',   90,  6500, 1,  8),
  ('Military / Senior',                30,  2500, 1,  9),
  ('Firefighter 🚒',                   30,  2500, 1, 10),
  ('Kids Age 5 & Up',                  30,  2000, 1, 11),
  ('Kids x2 Age 5 & Up',               60,  4000, 1, 12),
  ('Father & Son Age 5 & Up',          60,  5000, 1, 13),
  ('Father & 2 Sons Age 5 & Up',       90,  7000, 1, 14),
  ('2Q',                               60,  4000, 1, 15);

-- ─── Availability ─────────────────────────────────────────────────────────
INSERT INTO availability (staff_id, day_of_week, start_time, end_time) VALUES
  (1, 2, '09:00', '17:00'),
  (1, 3, '09:00', '17:00'),
  (1, 4, '09:00', '17:00'),
  (1, 5, '09:00', '17:00'),
  (1, 6, '09:00', '17:00');
