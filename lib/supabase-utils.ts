import { Athlete, Template, TemplateCheckpoint } from "./supabase-types";
import { createClient } from "./supabase/client";

export const supabase = createClient();

// Time validation utilities
export const timeValidation = {
  swim: { min: 0, max: 150 }, // 0 to 2h30min in minutes
  bike: { min: 0, max: 480 }, // 0 to 8h in minutes
  run: { min: 0, max: 300 }, // 0 to 5h in minutes
  transition: { min: 0, max: 30 }, // 0 to 30min for transitions
};
export function durationToSeconds(duration: string | null): number {
  if (!duration) {
    return 0;
  }
  const [h, m, s] = duration.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

export function validateTimeInput(
  timeString: string,
  discipline: "swim" | "bike" | "run" | "transition"
): { isValid: boolean; error?: string } {
  if (!timeString) return { isValid: true }; // Allow empty times

  // Parse HH:MM:SS format
  const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/;
  const match = timeString.match(timeRegex);

  if (!match) {
    return { isValid: false, error: "Time must be in HH:MM:SS format" };
  }

  const hours = Number.parseInt(match[1]);
  const minutes = Number.parseInt(match[2]);
  const seconds = Number.parseInt(match[3]);

  if (minutes >= 60 || seconds >= 60) {
    return {
      isValid: false,
      error: "Minutes and seconds must be less than 60",
    };
  }

  const totalMinutes = hours * 60 + minutes + seconds / 60;
  const limits = timeValidation[discipline];

  if (totalMinutes > limits.max) {
    const maxHours = Math.floor(limits.max / 60);
    const maxMins = limits.max % 60;
    return {
      isValid: false,
      error: `${discipline} time cannot exceed ${maxHours}:${maxMins
        .toString()
        .padStart(2, "0")}:00`,
    };
  }

  return { isValid: true };
}

export function formatTimeWithSeconds(timeString: string | null): string {
  if (!timeString) return "--:--:--";

  // If it's already in HH:MM:SS format, return as is
  if (timeString.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
    return timeString;
  }

  // Handle PostgreSQL interval format (e.g., "01:30:00", "1:30:00", "90:00", etc.)
  try {
    // If it contains only hours and minutes, add seconds
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
      return `${timeString}:00`;
    }

    // If it's in PostgreSQL interval format like "01:30:00"
    if (timeString.includes(":")) {
      const parts = timeString.split(":");
      if (parts.length === 3) {
        const hours = parts[0].padStart(2, "0");
        const minutes = parts[1].padStart(2, "0");
        const seconds = parts[2].padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
      }
      if (parts.length === 2) {
        const hours = parts[0].padStart(2, "0");
        const minutes = parts[1].padStart(2, "0");
        return `${hours}:${minutes}:00`;
      }
    }

    // Try to parse as a time string
    const date = new Date(`1970-01-01T${timeString}`);
    if (!isNaN(date.getTime())) {
      return date.toTimeString().slice(0, 8);
    }

    return timeString;
  } catch {
    return timeString;
  }
}

export function calculateElapsedTime(
  startTime: string | undefined,
  endTime: string
): string {
  if (!startTime) {
    return "";
  }
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diff = end.getTime() - start.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function parseTimeToSeconds(timeStr: string): number {
  // Ensure we have the full HH:MM:SS format
  const formattedTime = formatTimeWithSeconds(timeStr);
  if (formattedTime === "--:--:--") return 0;

  const [hours, minutes, seconds] = formattedTime.split(":").map(Number);
  return hours * 3600 + minutes * 60 + (seconds || 0);
}

// Calculate predicted total time from individual components
export function calculatePredictedTotalTime(athlete: Athlete): string {
  if (
    !athlete.predicted_swim_time ||
    !athlete.predicted_bike_time ||
    !athlete.predicted_run_time ||
    !athlete.predicted_t1_time ||
    !athlete.predicted_t2_time
  ) {
    return "--:--:--";
  }

  const swimSeconds = parseTimeToSeconds(athlete.predicted_swim_time);
  const bikeSeconds = parseTimeToSeconds(athlete.predicted_bike_time);
  const runSeconds = parseTimeToSeconds(athlete.predicted_run_time);
  const t1Seconds = parseTimeToSeconds(athlete.predicted_t1_time);
  const t2Seconds = parseTimeToSeconds(athlete.predicted_t2_time);

  const totalSeconds =
    swimSeconds + bikeSeconds + runSeconds + t1Seconds + t2Seconds;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Pace and speed calculation utilities
export function calculateSwimPace(
  timeStr: string | null,
  distanceKm: number
): string {
  if (!timeStr || timeStr === "--:--:--" || !distanceKm) return "--:--";

  const totalSeconds = parseTimeToSeconds(timeStr);
  const totalMinutes = totalSeconds / 60;
  const distanceMeters = distanceKm * 1000;
  const paceMinsPer100m = (totalMinutes / distanceMeters) * 100;

  const minutes = Math.floor(paceMinsPer100m);
  const seconds = Math.round((paceMinsPer100m - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export function formatTimeDiff(startTime:string|undefined,endTime:string|null) {
  let endDate = new Date().getTime()
  if (endTime) {
    endDate = new Date(endTime).getTime(); 
  }
  if (!startTime) {
    startTime = "2025-09-06"
  }
  const startDate = new Date(startTime).getTime(); 
  const diffMs = endDate-startDate
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}
export function calculateBikeSpeed(
  timeStr: string | null,
  distanceKm: number|undefined
): string {
  if (!timeStr || timeStr === "--:--:--" || !distanceKm) return "--";

  const totalSeconds = parseTimeToSeconds(timeStr);
  const totalHours = totalSeconds / 3600;
  const speed = distanceKm / totalHours;

  return speed.toFixed(1);
}

export function calculateRunPace(
  timeStr: string | null,
  distanceKm: number
): string {
  if (!timeStr || timeStr === "--:--:--" || !distanceKm) return "--:--";

  const totalSeconds = parseTimeToSeconds(timeStr);
  const totalMinutes = totalSeconds / 60;
  const paceMinutesPerKm = totalMinutes / distanceKm;

  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Calculate pace for checkpoints based on their type and distance
export function calculateCheckpointPace(
  timeStr: string,
  distanceKm: number,
  checkpointType: string
): string {
  if (!timeStr || timeStr === "--:--:--" || !distanceKm) return "";

  switch (checkpointType) {
    case "swim_start":
    case "swim_finish":
      return `(${calculateSwimPace(timeStr, distanceKm)}/100m)`;
    case "bike_checkpoint":
      return `(${calculateBikeSpeed(timeStr, distanceKm)} km/h)`;
    case "run_checkpoint":
    case "finish":
      // For run checkpoints, we need to calculate pace based on run distance only
      return `(${calculateRunPace(timeStr, distanceKm)}/km)`;
    case "t1_finish":
    case "t2_finish":
      return ""; // No pace for transitions
    default:
      return "";
  }
}

// Get cumulative distance up to a checkpoint
export function getCumulativeDistance(
  checkpoint: TemplateCheckpoint,
  template: Template
): number {
  switch (checkpoint.checkpoint_type) {
    case "swim_start":
      return 0;
    case "swim_finish":
      return template.swim_distance;
    case "t1_finish":
      return template.swim_distance;
    case "bike_checkpoint":
      return template.swim_distance + (checkpoint.distance_km || 0);
    case "t2_finish":
      return template.swim_distance + template.bike_distance;
    case "run_checkpoint":
      return (
        template.swim_distance +
        template.bike_distance +
        (checkpoint.distance_km || 0)
      );
    case "finish":
      return (
        template.swim_distance + template.bike_distance + template.run_distance
      );
    default:
      return 0;
  }
}
