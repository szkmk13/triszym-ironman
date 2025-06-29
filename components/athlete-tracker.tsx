"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  supabase,
  type Athlete,
  type TemplateCheckpoint,
  formatTimeWithSeconds,
  calculateElapsedTime,
} from "@/lib/supabase"

interface AthleteTrackerProps {
  athlete: Athlete
}

export function AthleteTracker({ athlete }: AthleteTrackerProps) {
  const [checkpoints, setCheckpoints] = useState<TemplateCheckpoint[]>([])
  const [times, setTimes] = useState<{ [key: number]: string }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCheckpoints()
    fetchAthleteTimes()
  }, [athlete.id])

  const fetchCheckpoints = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("template_checkpoints")
      .select("*")
      .eq("template_id", athlete.template_id)
      .order("order_index")

    if (error) {
      console.error("Error fetching checkpoints:", error)
    } else {
      setCheckpoints(data || [])
    }
    setLoading(false)
  }

  const fetchAthleteTimes = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("athlete_times").select("*").eq("athlete_id", athlete.id)

    if (error) {
      console.error("Error fetching athlete times:", error)
    } else {
      const timeMap: { [key: number]: string } = {}
      data?.forEach((time) => {
        timeMap[time.checkpoint_id] = time.actual_time
      })
      setTimes(timeMap)
    }
    setLoading(false)
  }

  const getElapsedTime = (checkpointId: number): string => {
    if (!athlete.race_start_time) return "--:--:--"
    if (!times[checkpointId]) return "--:--:--"

    return calculateElapsedTime(athlete.race_start_time, times[checkpointId])
  }

  const getTotalTime = (): string => {
    if (!athlete.race_start_time) return "--:--:--"
    if (checkpoints.length === 0) return "--:--:--"
    const finishCheckpoint = checkpoints[checkpoints.length - 1]
    if (!times[finishCheckpoint.id]) return "--:--:--"

    return calculateElapsedTime(athlete.race_start_time, times[finishCheckpoint.id])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{athlete.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Total Time:</div>
              <div>{getTotalTime()}</div>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Checkpoint</th>
                  <th className="text-left">Time</th>
                  <th className="text-left">Elapsed</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((checkpoint) => (
                  <tr key={checkpoint.id}>
                    <td>{checkpoint.name}</td>
                    <td>{formatTimeWithSeconds(times[checkpoint.id] || null)}</td>
                    <td>{getElapsedTime(checkpoint.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
