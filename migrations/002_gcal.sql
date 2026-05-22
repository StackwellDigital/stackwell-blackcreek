-- migrations/002_gcal.sql
-- Adds Google Calendar event ID to bookings table
-- Run: wrangler d1 execute stackwell-db --remote --file=migrations/002_gcal.sql

ALTER TABLE bookings ADD COLUMN gcal_event_id TEXT;
