-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  swim_distance DECIMAL(5,2) DEFAULT 1.5,
  bike_distance DECIMAL(5,2) DEFAULT 40,
  run_distance DECIMAL(5,2) DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template checkpoints table
CREATE TABLE IF NOT EXISTS template_checkpoints (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  template_id BIGINT REFERENCES templates(id) ON DELETE CASCADE,
  checkpoint_type TEXT NOT NULL, -- 'swim_start', 'swim_finish', 't1_finish', 'bike_checkpoint', 't2_finish', 'run_checkpoint', 'finish'
  name TEXT NOT NULL,
  distance_km DECIMAL(5,2), -- for bike and run checkpoints
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create athletes table
CREATE TABLE IF NOT EXISTS athletes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  template_id BIGINT REFERENCES templates(id) ON DELETE CASCADE,
  predicted_swim_time INTERVAL,
  predicted_bike_time INTERVAL,
  predicted_run_time INTERVAL,
  race_start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create athlete times table
CREATE TABLE IF NOT EXISTS athlete_times (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  athlete_id BIGINT REFERENCES athletes(id) ON DELETE CASCADE,
  checkpoint_id BIGINT REFERENCES template_checkpoints(id) ON DELETE CASCADE,
  actual_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(athlete_id, checkpoint_id)
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_times ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public can read templates" ON templates FOR SELECT USING (true);
CREATE POLICY "Public can insert templates" ON templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update templates" ON templates FOR UPDATE USING (true);

CREATE POLICY "Public can read template_checkpoints" ON template_checkpoints FOR SELECT USING (true);
CREATE POLICY "Public can insert template_checkpoints" ON template_checkpoints FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update template_checkpoints" ON template_checkpoints FOR UPDATE USING (true);

CREATE POLICY "Public can read athletes" ON athletes FOR SELECT USING (true);
CREATE POLICY "Public can insert athletes" ON athletes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update athletes" ON athletes FOR UPDATE USING (true);

CREATE POLICY "Public can read athlete_times" ON athlete_times FOR SELECT USING (true);
CREATE POLICY "Public can insert athlete_times" ON athlete_times FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update athlete_times" ON athlete_times FOR UPDATE USING (true);
