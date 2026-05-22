-- Services
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- cents
  duration INTEGER NOT NULL, -- minutes
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bio TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

-- Weekly availability (per staff or shop-wide if staff_id IS NULL)
CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER REFERENCES staff(id),
  day_of_week INTEGER NOT NULL, -- 0=Sun, 6=Sat
  start_time TEXT NOT NULL,     -- "09:00"
  end_time TEXT NOT NULL        -- "18:00"
);

-- Blocked times (vacations, lunch, etc)
CREATE TABLE IF NOT EXISTS blocked_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER REFERENCES staff(id), -- NULL = all staff
  date TEXT,             -- "2026-06-02" (NULL if recurring)
  day_of_week INTEGER,   -- for recurring blocks
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT,
  recurring INTEGER NOT NULL DEFAULT 0
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service_id INTEGER NOT NULL REFERENCES services(id),
  service_name TEXT NOT NULL,   -- denormalized for history
  service_price INTEGER NOT NULL,
  service_duration INTEGER NOT NULL,
  staff_id INTEGER REFERENCES staff(id),
  staff_name TEXT,
  booking_date TEXT NOT NULL,   -- "2026-05-20"
  booking_time TEXT NOT NULL,   -- "14:00"
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed|completed|cancelled|no-show
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed data
INSERT INTO services (name, price, duration, sort_order) VALUES
  ('Haircut', 3500, 30, 1),
  ('Haircut + Beard', 5000, 45, 2),
  ('Beard Trim', 2500, 20, 3),
  ('Color', 8000, 60, 4),
  ('Kids Cut', 2200, 25, 5),
  ('Hot Towel Shave', 4500, 40, 6);

INSERT INTO staff (name, bio) VALUES
  ('Default Barber', 'Owner & head barber');

-- Mon–Sat 9am–6pm for default barber
INSERT INTO availability (staff_id, day_of_week, start_time, end_time) VALUES
  (1, 1, '09:00', '18:00'),
  (1, 2, '09:00', '18:00'),
  (1, 3, '09:00', '18:00'),
  (1, 4, '09:00', '18:00'),
  (1, 5, '09:00', '18:00'),
  (1, 6, '09:00', '17:00');

-- Daily lunch block
INSERT INTO blocked_times (staff_id, day_of_week, start_time, end_time, reason, recurring) VALUES
  (1, 1, '12:00', '13:00', 'Lunch', 1),
  (1, 2, '12:00', '13:00', 'Lunch', 1),
  (1, 3, '12:00', '13:00', 'Lunch', 1),
  (1, 4, '12:00', '13:00', 'Lunch', 1),
  (1, 5, '12:00', '13:00', 'Lunch', 1),
  (1, 6, '12:00', '13:00', 'Lunch', 1);
