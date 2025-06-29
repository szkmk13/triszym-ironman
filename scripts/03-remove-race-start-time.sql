-- Remove race_start_time column from athletes table
ALTER TABLE athletes DROP COLUMN IF EXISTS race_start_time;
