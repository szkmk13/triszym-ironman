-- Dodaj kolumny dla map i tras do tabeli templates
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS map_image_url TEXT,
ADD COLUMN IF NOT EXISTS route_data JSONB;

-- Utwórz bucket dla map w Supabase Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('triathlon-maps', 'triathlon-maps', true)
ON CONFLICT (id) DO NOTHING;

-- Ustaw polityki dla bucket'a
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'triathlon-maps');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'triathlon-maps' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'triathlon-maps' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'triathlon-maps' AND auth.role() = 'authenticated');
