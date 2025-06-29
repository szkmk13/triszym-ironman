"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  supabase,
  type Athlete,
  type TemplateCheckpoint,
  type AthleteTime,
  calculateElapsedTime,
  formatTimeWithSeconds,
} from "@/lib/supabase"
import { toast } from "sonner"
import { ArrowLeft, Clock, CheckCircle, Trophy, MapPin, Play } from "lucide-react"

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = Number.parseInt(params.id as string)

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [checkpoints, setCheckpoints] = useState<TemplateCheckpoint[]>([])
  const [athleteTimes, setAthleteTimes] = useState<AthleteTime[]>([])
  const [currentTime, setCurrentTime] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (athleteId) {
      fetchAthleteData()
    }
  }, [athleteId])

  const fetchAthleteData = async () => {
    setLoading(true)
    try {
      const [athleteResult, checkpointsResult, timesResult] = await Promise.all([
        supabase
          .from("athletes")
          .select(`
            *,
            template:templates(*)
          `)
          .eq("id", athleteId)
          .single(),
        supabase
          .from("template_checkpoints")
          .select("*")
          .eq("template_id", athlete?.template_id || 0)
          .order("order_index"),
        supabase.from("athlete_times").select("*").eq("athlete_id", athleteId),
      ])

      if (athleteResult.error) throw athleteResult.error
      setAthlete(athleteResult.data)

      // Fetch checkpoints again with correct template_id
      if (athleteResult.data.template_id) {
        const { data: checkpointsData, error: checkpointsError } = await supabase
          .from("template_checkpoints")
          .select("*")
          .eq("template_id", athleteResult.data.template_id)
          .order("order_index")

        if (checkpointsError) throw checkpointsError
        setCheckpoints(checkpointsData || [])
      }

      if (timesResult.data) setAthleteTimes(timesResult.data)
    } catch (error) {
      console.error("Error fetching athlete data:", error)
      toast({
        title: "Error",
        description: "Failed to load athlete data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const recordTime = async (checkpointId: number) => {
    if (!currentTime) {
      toast({
        title: "Error",
        description: "Please enter a time",
        variant: "destructive",
      })
      return
    }

    // Validate time format
    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/
    if (!timeRegex.test(currentTime)) {
      toast({
        title: "Error",
        description: "Please enter time in HH:MM:SS format",
        variant: "destructive",
      })
      return
    }

    try {
      // Convert HH:MM:SS to a proper timestamp for today
      const today = new Date()
      const [hours, minutes, seconds] = currentTime.split(":").map(Number)
      const timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds)

      const { error } = await supabase.from("athlete_times").upsert({
        athlete_id: athleteId,
        checkpoint_id: checkpointId,
        actual_time: timestamp.toISOString(),
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Time recorded successfully",
      })

      fetchAthleteData()
      setCurrentTime("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record time",
        variant: "destructive",
      })
    }
  }

  const getCheckpointTime = (checkpointId: number) => {
    return athleteTimes.find((time) => time.checkpoint_id === checkpointId)
  }

  const getSwimStartTime = () => {
    const swimStartCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_start")
    return swimStartCheckpoint ? getCheckpointTime(swimStartCheckpoint.id) : null
  }

  const getCheckpointColor = (checkpoint: TemplateCheckpoint) => {
    const time = getCheckpointTime(checkpoint.id)
    if (time) return "bg-green-100 text-green-800"

    switch (checkpoint.checkpoint_type) {
      case "swim_start":
      case "swim_finish":
        return "bg-blue-100 text-blue-800"
      case "t1_finish":
      case "t2_finish":
        return "bg-yellow-100 text-yellow-800"
      case "bike_checkpoint":
        return "bg-orange-100 text-orange-800"
      case "run_checkpoint":
      case "finish":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getElapsedTime = (checkpointTime: string) => {
    const swimStartTime = getSwimStartTime()
    if (!swimStartTime) return "--:--:--"
    return calculateElapsedTime(swimStartTime.actual_time, checkpointTime)
  }

  const getRemainingTime = (discipline: "swim" | "bike" | "run", currentElapsed: string) => {
    if (!athlete) return "--:--:--"

    let predictedTime: string | null = null
    switch (discipline) {
      case "swim":
        predictedTime = athlete.predicted_swim_time
        break
      case "bike":
        predictedTime = athlete.predicted_bike_time
        break
      case "run":
        predictedTime = athlete.predicted_run_time
        break
    }

    if (!predictedTime || currentElapsed === "--:--:--") return "--:--:--"

    // Parse times and calculate difference
    const parseTime = (timeStr: string) => {
      const [hours, minutes, seconds] = timeStr.split(":").map(Number)
      return hours * 3600 + minutes * 60 + seconds
    }

    const predictedSeconds = parseTime(predictedTime)
    const elapsedSeconds = parseTime(currentElapsed)
    const remainingSeconds = predictedSeconds - elapsedSeconds

    if (remainingSeconds <= 0) return "Overtime"

    const hours = Math.floor(remainingSeconds / 3600)
    const minutes = Math.floor((remainingSeconds % 3600) / 60)
    const seconds = remainingSeconds % 60

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const parseTimeToSeconds = (timeStr: string): number => {
    // Ensure we have the full HH:MM:SS format
    const formattedTime = formatTimeWithSeconds(timeStr)
    if (formattedTime === "--:--:--") return 0

    const [hours, minutes, seconds] = formattedTime.split(":").map(Number)
    return hours * 3600 + minutes * 60 + (seconds || 0)
  }

  const formatSecondsToTime = (totalSeconds: number): string => {
    const absSeconds = Math.abs(totalSeconds)
    const hours = Math.floor(absSeconds / 3600)
    const minutes = Math.floor((absSeconds % 3600) / 60)
    const seconds = Math.floor(absSeconds % 60)

    const sign = totalSeconds < 0 ? "-" : "+"
    return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const getTimeDifference = (predictedTime: string, actualTime: string): string => {
    const predictedSeconds = parseTimeToSeconds(predictedTime)
    const actualSeconds = parseTimeToSeconds(actualTime)
    const difference = actualSeconds - predictedSeconds

    return formatSecondsToTime(difference)
  }

  const getTimeDifferenceColor = (predictedTime: string, actualTime: string): string => {
    const predictedSeconds = parseTimeToSeconds(predictedTime)
    const actualSeconds = parseTimeToSeconds(actualTime)
    const difference = actualSeconds - predictedSeconds

    if (difference < 0) return "text-green-600" // Faster than predicted
    if (difference > 0) return "text-red-600" // Slower than predicted
    return "text-gray-600" // Exactly on time
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading athlete data...</div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Athlete not found</div>
      </div>
    )
  }

  const swimStartTime = getSwimStartTime()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8" />
            {athlete.name}
          </h1>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{athlete.template?.name}</span>
            {swimStartTime && (
              <>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>Started: {new Date(swimStartTime.actual_time).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Predicted vs Actual Times */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Swim Analysis */}
            {athlete.predicted_swim_time && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-blue-800">Swim</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Predicted:</span>
                    <span className="font-medium text-blue-600">
                      {formatTimeWithSeconds(athlete.predicted_swim_time)}
                    </span>
                  </div>
                  {(() => {
                    const swimFinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_finish")
                    const swimFinishTime = swimFinishCheckpoint ? getCheckpointTime(swimFinishCheckpoint.id) : null
                    const actualSwimTime =
                      swimFinishTime && swimStartTime
                        ? calculateElapsedTime(swimStartTime.actual_time, swimFinishTime.actual_time)
                        : null

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Actual:</span>
                          <span className="font-medium text-blue-600">{actualSwimTime || "--:--:--"}</span>
                        </div>
                        {actualSwimTime && (
                          <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                            <span className="text-sm text-blue-700">Difference:</span>
                            <span
                              className={`font-bold ${getTimeDifferenceColor(athlete.predicted_swim_time, actualSwimTime)}`}
                            >
                              {getTimeDifference(athlete.predicted_swim_time, actualSwimTime)}
                            </span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Bike Analysis */}
            {athlete.predicted_bike_time && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-orange-800">Bike</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-orange-700">Predicted:</span>
                    <span className="font-medium text-orange-600">
                      {formatTimeWithSeconds(athlete.predicted_bike_time)}
                    </span>
                  </div>
                  {(() => {
                    const t1FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t1_finish")
                    const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
                    const t1Time = t1FinishCheckpoint ? getCheckpointTime(t1FinishCheckpoint.id) : null
                    const t2Time = t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null
                    const actualBikeTime =
                      t1Time && t2Time ? calculateElapsedTime(t1Time.actual_time, t2Time.actual_time) : null

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-orange-700">Actual:</span>
                          <span className="font-medium text-orange-600">{actualBikeTime || "--:--:--"}</span>
                        </div>
                        {actualBikeTime && (
                          <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                            <span className="text-sm text-orange-700">Difference:</span>
                            <span
                              className={`font-bold ${getTimeDifferenceColor(athlete.predicted_bike_time, actualBikeTime)}`}
                            >
                              {getTimeDifference(athlete.predicted_bike_time, actualBikeTime)}
                            </span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Run Analysis */}
            {athlete.predicted_run_time && (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-red-800">Run</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-700">Predicted:</span>
                    <span className="font-medium text-red-600">
                      {formatTimeWithSeconds(athlete.predicted_run_time)}
                    </span>
                  </div>
                  {(() => {
                    const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
                    const finishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "finish")
                    const t2Time = t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null
                    const finishTime = finishCheckpoint ? getCheckpointTime(finishCheckpoint.id) : null
                    const actualRunTime =
                      t2Time && finishTime ? calculateElapsedTime(t2Time.actual_time, finishTime.actual_time) : null

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-red-700">Actual:</span>
                          <span className="font-medium text-red-600">{actualRunTime || "--:--:--"}</span>
                        </div>
                        {actualRunTime && (
                          <div className="flex justify-between items-center pt-2 border-t border-red-200">
                            <span className="text-sm text-red-700">Difference:</span>
                            <span
                              className={`font-bold ${getTimeDifferenceColor(athlete.predicted_run_time, actualRunTime)}`}
                            >
                              {getTimeDifference(athlete.predicted_run_time, actualRunTime)}
                            </span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Recording */}
      <Card>
        <CardHeader>
          <CardTitle>Record Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="HH:MM:SS"
              value={currentTime}
              onChange={(e) => setCurrentTime(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => {
                const now = new Date()
                const timeString = now.toTimeString().slice(0, 8) // Gets HH:MM:SS format
                setCurrentTime(timeString)
              }}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Now
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Enter time in HH:MM:SS format or click "Now" for current time</p>
        </CardContent>
      </Card>

      {/* Checkpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Race Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checkpoints.map((checkpoint) => {
              const time = getCheckpointTime(checkpoint.id)
              const isCompleted = !!time
              const elapsedTime = time ? getElapsedTime(time.actual_time) : "--:--:--"

              return (
                <div key={checkpoint.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <div className="h-6 w-6 border-2 border-gray-300 rounded-full" />
                    )}
                    <div>
                      <div className="font-semibold">{checkpoint.name}</div>
                      {checkpoint.distance_km && (
                        <div className="text-sm text-gray-500">{checkpoint.distance_km}km</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge className={getCheckpointColor(checkpoint)}>
                      {checkpoint.checkpoint_type.replace("_", " ")}
                    </Badge>

                    {time ? (
                      <div className="text-right">
                        <div className="font-medium">{new Date(time.actual_time).toLocaleTimeString()}</div>
                        <div className="text-sm text-gray-500">Elapsed: {elapsedTime}</div>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => recordTime(checkpoint.id)} disabled={!currentTime}>
                        Record
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
