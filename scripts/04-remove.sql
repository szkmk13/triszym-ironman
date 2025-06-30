-- Add predicted transition times to athletes table
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS predicted_t1_time INTERVAL,
ADD COLUMN IF NOT EXISTS predicted_t2_time INTERVAL;
