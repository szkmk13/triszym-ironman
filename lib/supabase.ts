import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Template = {
  id: number
  name: string
  swim_distance: number
  bike_distance: number
  run_distance: number
}

export type TemplateCheckpoint = {
  id: number
  template_id: number
  checkpoint_type: string
  name: string
  distance_km: number | null
  order_index: number
}

export type Athlete = {
  id: number
  name: string
  template_id: number
  predicted_swim_time: string | null
  predicted_bike_time: string | null
  predicted_run_time: string | null
  template?: Template
}

export type AthleteTime = {
  id: number
  athlete_id: number
  checkpoint_id: number
  actual_time: string
}

// Time validation utilities
export const timeValidation = {
  swim: { min: 0, max: 150 }, // 0 to 2h30min in minutes
  bike: { min: 0, max: 480 }, // 0 to 8h in minutes
  run: { min: 0, max: 300 }, // 0 to 5h in minutes
}

export function validateTimeInput(
  timeString: string,
  discipline: "swim" | "bike" | "run",
): { isValid: boolean; error?: string } {
  if (!timeString) return { isValid: true } // Allow empty times

  // Parse HH:MM:SS format
  const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/
  const match = timeString.match(timeRegex)

  if (!match) {
    return { isValid: false, error: "Time must be in HH:MM:SS format" }
  }

  const hours = Number.parseInt(match[1])
  const minutes = Number.parseInt(match[2])
  const seconds = Number.parseInt(match[3])

  if (minutes >= 60 || seconds >= 60) {
    return { isValid: false, error: "Minutes and seconds must be less than 60" }
  }

  const totalMinutes = hours * 60 + minutes + seconds / 60
  const limits = timeValidation[discipline]

  if (totalMinutes > limits.max) {
    const maxHours = Math.floor(limits.max / 60)
    const maxMins = limits.max % 60
    return {
      isValid: false,
      error: `${discipline} time cannot exceed ${maxHours}:${maxMins.toString().padStart(2, "0")}:00`,
    }
  }

  return { isValid: true }
}

export function formatTimeWithSeconds(timeString: string | null): string {
  if (!timeString) return "--:--:--"

  // If it's already in HH:MM:SS format, return as is
  if (timeString.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
    return timeString
  }

  // Handle PostgreSQL interval format (e.g., "01:30:00", "1:30:00", "90:00", etc.)
  try {
    // If it contains only hours and minutes, add seconds
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
      return `${timeString}:00`
    }

    // If it's in PostgreSQL interval format like "01:30:00"
    if (timeString.includes(":")) {
      const parts = timeString.split(":")
      if (parts.length === 3) {
        const hours = parts[0].padStart(2, "0")
        const minutes = parts[1].padStart(2, "0")
        const seconds = parts[2].padStart(2, "0")
        return `${hours}:${minutes}:${seconds}`
      }
      if (parts.length === 2) {
        const hours = parts[0].padStart(2, "0")
        const minutes = parts[1].padStart(2, "0")
        return `${hours}:${minutes}:00`
      }
    }

    // Try to parse as a time string
    const date = new Date(`1970-01-01T${timeString}`)
    if (!isNaN(date.getTime())) {
      return date.toTimeString().slice(0, 8)
    }

    return timeString
  } catch {
    return timeString
  }
}

export function calculateElapsedTime(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diff = end.getTime() - start.getTime()

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function parseTimeToSeconds(timeStr: string): number {
  // Ensure we have the full HH:MM:SS format
  const formattedTime = formatTimeWithSeconds(timeStr)
  if (formattedTime === "--:--:--") return 0

  const [hours, minutes, seconds] = formattedTime.split(":").map(Number)
  return hours * 3600 + minutes * 60 + (seconds || 0)
}
