-- Usuń stare kolumny jeśli istnieją
ALTER TABLE templates 
DROP COLUMN IF EXISTS map_image_url,
DROP COLUMN IF EXISTS route_data;

-- Dodaj nowe kolumny dla każdego segmentu
ALTER TABLE templates 
ADD COLUMN swim_map_url TEXT,
ADD COLUMN swim_route_data JSONB,
ADD COLUMN bike_map_url TEXT,
ADD COLUMN bike_route_data JSONB,
ADD COLUMN run_map_url TEXT,
ADD COLUMN run_route_data JSONB;

-- Dodaj komentarze dla lepszego zrozumienia
COMMENT ON COLUMN templates.swim_map_url IS 'URL do mapy segmentu pływackiego';
COMMENT ON COLUMN templates.swim_route_data IS 'Dane trasy pływackiej jako JSON';
COMMENT ON COLUMN templates.bike_map_url IS 'URL do mapy segmentu rowerowego';
COMMENT ON COLUMN templates.bike_route_data IS 'Dane trasy rowerowej jako JSON';
COMMENT ON COLUMN templates.run_map_url IS 'URL do mapy segmentu biegowego';
COMMENT ON COLUMN templates.run_route_data IS 'Dane trasy biegowej jako JSON';
