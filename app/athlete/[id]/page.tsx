"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  calculateElapsedTime,
  formatTimeWithSeconds,
  calculateSwimPace,
  calculateBikeSpeed,
  calculateRunPace,
  calculateCheckpointPace,
  calculatePredictedTotalTime,
} from "@/lib/supabase"

import { ArrowLeft, Clock, CheckCircle, Trophy, MapPin, Play } from "lucide-react"
import { useAthlete, useCheckpoints, useAthleteTimes, useRecordTime } from "@/lib/queries"

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = Number.parseInt(params.id as string)

  const { data: athlete, isLoading: athleteLoading } = useAthlete(athleteId)
  const { data: checkpoints = [] } = useCheckpoints(athlete?.template_id || 0)
  const { data: athleteTimes = [] } = useAthleteTimes(athleteId)
  const recordTimeMutation = useRecordTime()

  const [currentTime, setCurrentTime] = useState("")

  const recordTime = async (checkpointId: number) => {
    if (!currentTime) {
      return
    }

    // Validate time format
    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/
    if (!timeRegex.test(currentTime)) {
      return
    }

    try {
      // Convert HH:MM:SS to a proper timestamp for today
      const today = new Date()
      const [hours, minutes, seconds] = currentTime.split(":").map(Number)
      const timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds)

      await recordTimeMutation.mutateAsync({
        athlete_id: athleteId,
        checkpoint_id: checkpointId,
        actual_time: timestamp.toISOString(),
      })

      setCurrentTime("")
    } catch (error) {
      console.log(error)
    }
  }

  const getCheckpointTime = (checkpointId: number) => {
    return athleteTimes.find((time) => time.checkpoint_id === checkpointId)
  }

  const getSwimStartTime = () => {
    const swimStartCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_start")
    return swimStartCheckpoint ? getCheckpointTime(swimStartCheckpoint.id) : null
  }

  const getCheckpointColor = (checkpoint: any) => {
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

  const parseTimeToSeconds = (timeStr: string): number => {
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

  // Helper function to get estimated finish time
  const getEstimatedFinishTime = () => {
    const swimStartTime = getSwimStartTime()
    if (!swimStartTime || !athlete) return null

    const finishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "finish")
    const finishTime = finishCheckpoint ? getCheckpointTime(finishCheckpoint.id) : null
    
    if (finishTime) return null // Already finished

    const predictedTotalSeconds = parseTimeToSeconds(calculatePredictedTotalTime(athlete))
    if (predictedTotalSeconds === 0) return null

    const startTime = new Date(swimStartTime.actual_time)
    const estimatedFinishTime = new Date(startTime.getTime() + predictedTotalSeconds * 1000)
    
    return estimatedFinishTime.toLocaleTimeString()
  }

  // Helper function to get the last checkpoint for bike/run segments
  const getLastCheckpointForSegment = (checkpointType: string, currentCheckpoint: any) => {
    if (checkpointType === "swim_finish") {
      const swimStartCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_start")
      return swimStartCheckpoint ? getCheckpointTime(swimStartCheckpoint.id) : null
    }
    
    if (checkpointType === "bike_checkpoint") {
      // Find the previous checkpoint in the bike segment
      const bikeCheckpoints = checkpoints
        .filter((cp) => cp.checkpoint_type === "bike_checkpoint" || cp.checkpoint_type === "t1_finish")
        .sort((a, b) => a.order_index - b.order_index)
      
      const currentIndex = bikeCheckpoints.findIndex((cp) => cp.id === currentCheckpoint.id)
      if (currentIndex > 0) {
        return getCheckpointTime(bikeCheckpoints[currentIndex - 1].id)
      } else {
        // First bike checkpoint, use T1 finish
        const t1FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t1_finish")
        return t1FinishCheckpoint ? getCheckpointTime(t1FinishCheckpoint.id) : null
      }
    }
    
    if (checkpointType === "run_checkpoint" || checkpointType === "finish") {
      // Find the previous checkpoint in the run segment
      const runCheckpoints = checkpoints
        .filter((cp) => cp.checkpoint_type === "run_checkpoint" || cp.checkpoint_type === "t2_finish" || cp.checkpoint_type === "finish")
        .sort((a, b) => a.order_index - b.order_index)
      
      const currentIndex = runCheckpoints.findIndex((cp) => cp.id === currentCheckpoint.id)
      if (currentIndex > 0) {
        return getCheckpointTime(runCheckpoints[currentIndex - 1].id)
      } else {
        // First run checkpoint, use T2 finish
        const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
        return t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null
      }
    }
    
    return null
  }

  if (athleteLoading) {
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
  const predictedTotalTime = calculatePredictedTotalTime(athlete)
  const estimatedFinishTime = getEstimatedFinishTime()

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      {formatTimeWithSeconds(athlete.predicted_swim_time)} (
                      {calculateSwimPace(athlete.predicted_swim_time, athlete.template?.swim_distance || 0)}/100m)
                    </span>
                  </div>
                  {(() => {
                    const swimFinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_finish")
                    const swimFinishTime = swimFinishCheckpoint ? getCheckpointTime(swimFinishCheckpoint.id) : null
                    const actualSwimTime =
                      swimFinishTime && swimStartTime
                        ? calculateElapsedTime(swimStartTime.actual_time, swimFinishTime.actual_time)
                        : null
                    const totalTimeElapsed = swimFinishTime && swimStartTime 
                      ? calculateElapsedTime(swimStartTime.actual_time, swimFinishTime.actual_time) 
                      : null

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Actual:</span>
                          <span className="font-medium text-blue-600">
                            {actualSwimTime
                              ? `${actualSwimTime} (${calculateSwimPace(actualSwimTime, athlete.template?.swim_distance || 0)}/100m)`
                              : "--:--:--"}
                          </span>
                        </div>
                        {totalTimeElapsed && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">Total Elapsed:</span>
                            <span className="font-medium text-blue-600">{totalTimeElapsed}</span>
                          </div>
                        )}
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
                      {formatTimeWithSeconds(athlete.predicted_bike_time)} (
                      {calculateBikeSpeed(athlete.predicted_bike_time, athlete.template?.bike_distance || 0)} km/h)
                    </span>
                  </div>
                  {(() => {
                    const t1FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t1_finish")
                    const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
                    const t1Time = t1FinishCheckpoint ? getCheckpointTime(t1FinishCheckpoint.id) : null
                    const t2Time = t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null
                    const actualBikeTime =
                      t1Time && t2Time ? calculateElapsedTime(t1Time.actual_time, t2Time.actual_time) : null
                    const totalTimeElapsed = t2Time && swimStartTime 
                      ? calculateElapsedTime(swimStartTime.actual_time, t2Time.actual_time) 
                      : null

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-orange-700">Actual:</span>
                          <span className="font-medium text-orange-600">
                            {actualBikeTime
                              ? `${actualBikeTime} (${calculateBikeSpeed(actualBikeTime, athlete.template?.bike_distance || 0)} km/h)`
                              : "--:--:--"}
                          </span>
                        </div>
                        {totalTimeElapsed && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-orange-700">Total Elapsed:</span>
                            <span className="font-medium text-orange-600">{totalTimeElapsed}</span>
                          </div>
                        )}
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
                      {formatTimeWithSeconds(athlete.predicted_run_time)} (
                      {calculateRunPace(athlete.predicted_run_time, athlete.template?.run_distance || 0)}/km)
                    </span>
                  </div>
                  {(() => {
                    const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
                    const finishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "finish")
                    const t2Time = t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null
                    const finishTime = finishCheckpoint ? getCheckpointTime(finishCheckpoint.id) : null
                    const actualRunTime =
                      t2Time && finishTime ? calculateElapsedTime(t2Time.actual_time, finishTime.actual_time) : null
                    const totalTimeElapsed = finishTime && swimStartTime 
                      ? calculateElapsedTime(swimStartTime.actual_time, finishTime.actual_time) 
                      : null

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-red-700">Actual:</span>
                          <span className="font-medium text-red-600">
                            {actualRunTime
                              ? `${actualRunTime} (${calculateRunPace(actualRunTime, athlete.template?.run_distance || 0)}/km)`
                              : "--:--:--"}
                          </span>
                        </div>
                        {totalTimeElapsed && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-red-700">Total Elapsed:</span>
                            <span className="font-medium text-red-600">{totalTimeElapsed}</span>
                          </div>
                        )}
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

            {/* Total Time Analysis */}
            {predictedTotalTime !== "--:--:--" && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-gray-800">Total Time</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Predicted:</span>
                    <span className="font-medium text-gray-600">
                      {predictedTotalTime}
                      {estimatedFinishTime && (
                        <span className="text-xs text-gray-500 ml-1">
                          (Est. finish: {estimatedFinishTime})
                        </span>
                      )}
                    </span>
                  </div>
                  {(() => {
                    const finishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "finish")
                    const finishTime = finishCheckpoint ? getCheckpointTime(finishCheckpoint.id) : null
                    const actualTotalTime =
                      finishTime && swimStartTime
                        ? calculateElapsedTime(swimStartTime.actual_time, finishTime.actual_time)
                        : null

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Actual:</span>
                          <span className="font-medium text-gray-600">{actualTotalTime || "--:--:--"}</span>
                        </div>
                        {actualTotalTime && (
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-sm text-gray-700">Difference:</span>
                            <span
                              className={`font-bold ${getTimeDifferenceColor(predictedTotalTime, actualTotalTime)}`}
                            >
                              {getTimeDifference(predictedTotalTime, actualTotalTime)}
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

              // Calculate pace for this checkpoint using the last checkpoint
              let paceInfo = ""
              if (time && athlete.template) {
                if (checkpoint.checkpoint_type === "swim_finish") {
                  paceInfo = calculateCheckpointPace(
                    elapsedTime,
                    athlete.template.swim_distance,
                    checkpoint.checkpoint_type,
                  )
                } else if (checkpoint.checkpoint_type === "bike_checkpoint" && checkpoint.distance_km) {
                  // Calculate elapsed time from last checkpoint for bike segments
                  const lastCheckpointTime = getLastCheckpointForSegment("bike_checkpoint", checkpoint)
                  if (lastCheckpointTime) {
                    const segmentElapsedTime = calculateElapsedTime(lastCheckpointTime.actual_time, time.actual_time)
                    
                    // Calculate distance from last checkpoint
                    const bikeCheckpoints = checkpoints
                      .filter((cp) => cp.checkpoint_type === "bike_checkpoint" || cp.checkpoint_type === "t1_finish")
                      .sort((a, b) => a.order_index - b.order_index)
                    
                    const currentIndex = bikeCheckpoints.findIndex((cp) => cp.id === checkpoint.id)
                    const previousDistance = currentIndex > 0 && bikeCheckpoints[currentIndex - 1].distance_km 
                      ? bikeCheckpoints[currentIndex - 1].distance_km 
                      : 0
                    
                    const segmentDistance = checkpoint.distance_km - previousDistance
                    paceInfo = calculateCheckpointPace(segmentElapsedTime, segmentDistance, checkpoint.checkpoint_type)
                  } else {
                    paceInfo = calculateCheckpointPace(elapsedTime, checkpoint.distance_km, checkpoint.checkpoint_type)
                  }
                } else if ((checkpoint.checkpoint_type === "run_checkpoint" || checkpoint.checkpoint_type === "finish") && checkpoint.distance_km) {
                  // Calculate elapsed time from last checkpoint for run segments
                  const lastCheckpointTime = getLastCheckpointForSegment(checkpoint.checkpoint_type, checkpoint)
                  if (lastCheckpointTime) {
                    const segmentElapsedTime = calculateElapsedTime(lastCheckpointTime.actual_time, time.actual_time)
                    
                    // Calculate distance from last checkpoint
                    const runCheckpoints = checkpoints
                      .filter((cp) => cp.checkpoint_type === "run_checkpoint" || cp.checkpoint_type === "t2_finish" || cp.checkpoint_type === "finish")
                      .sort((a, b) => a.order_index - b.order_index)
                    
                    const currentIndex = runCheckpoints.findIndex((cp) => cp.id === checkpoint.id)
                    const previousDistance = currentIndex > 0 && runCheckpoints[currentIndex - 1].distance_km 
                      ? runCheckpoints[currentIndex - 1].distance_km 
                      : 0
                    
                    const segmentDistance = checkpoint.checkpoint_type === "finish" 
                      ? athlete.template.run_distance - previousDistance
                      : checkpoint.distance_km - previousDistance
                      
                    paceInfo = calculateCheckpointPace(segmentElapsedTime, segmentDistance, checkpoint.checkpoint_type)
                  } else if (checkpoint.checkpoint_type === "finish") {
                    paceInfo = calculateCheckpointPace(
                      elapsedTime,
                      athlete.template.run_distance,
                      checkpoint.checkpoint_type,
                    )
                  } else {
                    paceInfo = calculateCheckpointPace(elapsedTime, checkpoint.distance_km, checkpoint.checkpoint_type)
                  }
                }
              }

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
                        <div className="text-sm text-gray-500">
                          Elapsed: {elapsedTime} {paceInfo}
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => recordTime(checkpoint.id)}
                        disabled={!currentTime || recordTimeMutation.isPending}
                      >
                        {recordTimeMutation.isPending ? "Recording..." : "Record"}
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