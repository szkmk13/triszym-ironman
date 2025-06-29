-- Insert default templates
INSERT INTO templates (name, swim_distance, bike_distance, run_distance) VALUES
('Kórnik', 1.5, 40, 10),
('Malbork', 1.9, 90, 21)
ON CONFLICT (name) DO NOTHING;

-- Get template IDs for seeding checkpoints
DO $$
DECLARE
    kornik_id BIGINT;
    malbork_id BIGINT;
BEGIN
    SELECT id INTO kornik_id FROM templates WHERE name = 'Kórnik';
    SELECT id INTO malbork_id FROM templates WHERE name = 'Malbork';
    
    -- Kórnik checkpoints
    INSERT INTO template_checkpoints (template_id, checkpoint_type, name, distance_km, order_index) VALUES
    (kornik_id, 'swim_start', 'Race Start', 0, 1),
    (kornik_id, 'swim_finish', 'Out of Water', 1.5, 2),
    (kornik_id, 't1_finish', 'Out of T1', 1.5, 3),
    (kornik_id, 'bike_checkpoint', 'Bike 10km', 10, 4),
    (kornik_id, 'bike_checkpoint', 'Bike 20km', 20, 5),
    (kornik_id, 'bike_checkpoint', 'Bike 30km', 30, 6),
    (kornik_id, 'bike_checkpoint', 'Bike 40km', 40, 7),
    (kornik_id, 't2_finish', 'Out of T2', 40, 8),
    (kornik_id, 'run_checkpoint', 'Run 2.5km', 2.5, 9),
    (kornik_id, 'run_checkpoint', 'Run 5km', 5, 10),
    (kornik_id, 'run_checkpoint', 'Run 7.5km', 7.5, 11),
    (kornik_id, 'finish', 'Finish', 10, 12)
    ON CONFLICT DO NOTHING;
    
    -- Malbork checkpoints
    INSERT INTO template_checkpoints (template_id, checkpoint_type, name, distance_km, order_index) VALUES
    (malbork_id, 'swim_start', 'Race Start', 0, 1),
    (malbork_id, 'swim_finish', 'Out of Water', 1.9, 2),
    (malbork_id, 't1_finish', 'Out of T1', 1.9, 3),
    (malbork_id, 'bike_checkpoint', 'Bike 20km', 20, 4),
    (malbork_id, 'bike_checkpoint', 'Bike 40km', 40, 5),
    (malbork_id, 'bike_checkpoint', 'Bike 60km', 60, 6),
    (malbork_id, 'bike_checkpoint', 'Bike 80km', 80, 7),
    (malbork_id, 'bike_checkpoint', 'Bike 90km', 90, 8),
    (malbork_id, 't2_finish', 'Out of T2', 90, 9),
    (malbork_id, 'run_checkpoint', 'Run 5km', 5, 10),
    (malbork_id, 'run_checkpoint', 'Run 10km', 10, 11),
    (malbork_id, 'run_checkpoint', 'Run 15km', 15, 12),
    (malbork_id, 'run_checkpoint', 'Run 21km', 21, 13),
    (malbork_id, 'finish', 'Finish', 21, 14)
    ON CONFLICT DO NOTHING;
END $$;
