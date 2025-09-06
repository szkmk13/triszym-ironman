import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTimeWithSeconds, calculatePredictedTotalTime } from "@/lib/supabase-utils"
import SegmentAnalysis from "./segment-analysis"
import { Athlete, AthleteTime,TemplateCheckpoint } from "@/lib/supabase-types"

interface PerformanceAnalysisProps {
  athlete: Athlete
  checkpoints: TemplateCheckpoint[]
  getCheckpointTime: (id: number) => AthleteTime|undefined
  swimStartTimeString: string|undefined
}

export default function PerformanceAnalysis({
  athlete,
  checkpoints,
  getCheckpointTime,
  swimStartTimeString,
}: PerformanceAnalysisProps) {
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
    if (difference < 0) return "text-green-600"
    if (difference > 0) return "text-red-600"
    return "text-gray-600"
  }

  const getEstimatedFinishTime = () => {
    if (!swimStartTimeString || !athlete) return null
    const finishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "finish")
    const finishTime = finishCheckpoint ? getCheckpointTime(finishCheckpoint.id) : null

    if (finishTime) return null
    const predictedTotalSeconds = parseTimeToSeconds(calculatePredictedTotalTime(athlete))
    if (predictedTotalSeconds === 0) return null

    const startTime = new Date(swimStartTimeString)
    const estimatedFinishTime = new Date(startTime.getTime() + predictedTotalSeconds * 1000)
    return estimatedFinishTime.toLocaleTimeString("en-GB", { hour12: false })
  }

  const predictedTotalTime = calculatePredictedTotalTime(athlete)
  const estimatedFinishTime = getEstimatedFinishTime()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Założenia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Swim Analysis */}
          {athlete.predicted_swim_time && (
            <SegmentAnalysis
              type="swim"
              athlete={athlete}
              checkpoints={checkpoints}
              getCheckpointTime={getCheckpointTime}
              swimStartTimeString={swimStartTimeString}
              getTimeDifference={getTimeDifference}
              getTimeDifferenceColor={getTimeDifferenceColor}
            />
          )}

          {/* Bike Analysis */}
          {athlete.predicted_bike_time && (
            <SegmentAnalysis
              type="bike"
              athlete={athlete}
              checkpoints={checkpoints}
              getCheckpointTime={getCheckpointTime}
              swimStartTimeString={swimStartTimeString}
              getTimeDifference={getTimeDifference}
              getTimeDifferenceColor={getTimeDifferenceColor}
            />
          )}

          {/* Run Analysis */}
          {athlete.predicted_run_time && (
            <SegmentAnalysis
              type="run"
              athlete={athlete}
              checkpoints={checkpoints}
              getCheckpointTime={getCheckpointTime}
              swimStartTimeString={swimStartTimeString}
              getTimeDifference={getTimeDifference}
              getTimeDifferenceColor={getTimeDifferenceColor}
            />
          )}

          {/* Total Time Analysis */}
          {predictedTotalTime !== "--:--:--" && (
            <SegmentAnalysis
              type="total"
              athlete={athlete}
              checkpoints={checkpoints}
              getCheckpointTime={getCheckpointTime}
              swimStartTimeString={swimStartTimeString}
              getTimeDifference={getTimeDifference}
              getTimeDifferenceColor={getTimeDifferenceColor}
              predictedTotalTime={predictedTotalTime}
              estimatedFinishTime={estimatedFinishTime}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
