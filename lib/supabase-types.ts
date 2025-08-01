export interface RoutePoint {
  x: number;
  y: number;
}

export interface RouteData {
  points: RoutePoint[];
  color: string;
  laps: number; // Number of laps for this route
}

export type Template = {
  id: number;
  name: string;
  swim_distance: number;
  bike_distance: number;
  run_distance: number;
  swim_map_url?: string;
  swim_route_data?: RouteData;
  bike_map_url?: string;
  bike_route_data?: RouteData;
  run_map_url?: string;
  run_route_data?: RouteData;
  checkpoints: TemplateCheckpoint[]
};

export type TemplateCheckpoint = {
  checkpoint_type: string;
  created_at: Date;
  distance_km: number;
  id: number;
  name: string;
  order_index: number;
  template_id: number;
};

export type Athlete = {
  created_at: Date;
  id: number;
  name: string;
  predicted_bike_time: string | null;
  predicted_run_time: string | null;
  predicted_swim_time: string| null;
  predicted_t1_time: string | null;
  predicted_t2_time: string | null;
  template?: Template;
  template_id?: number;
  times?:AthleteTime[]
};

export type AthleteTime = {
  id: number;
  athlete_id: number;
  checkpoint_id: number;
  actual_time: string;
};
