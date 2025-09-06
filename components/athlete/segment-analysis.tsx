import { Athlete, AthleteTime, TemplateCheckpoint } from "@/lib/supabase-types"
import {
  calculateElapsedTime,
  formatTimeWithSeconds,
  calculateSwimPace,
  calculateBikeSpeed,
  calculateRunPace,
} from "@/lib/supabase-utils"

interface SegmentAnalysisProps {
  type: "swim" | "bike" | "run" | "total"
  athlete: Athlete
  checkpoints: TemplateCheckpoint[]
  getCheckpointTime: (id: number) => AthleteTime|undefined
  swimStartTimeString: string|undefined
  getTimeDifference: (predicted: string, actual: string) => string
  getTimeDifferenceColor: (predicted: string, actual: string) => string
  predictedTotalTime?: string
  estimatedFinishTime?: string | null
}

// Helper function to add/subtract time from a time string
function adjustTimeByDifference(baseTime: string, differenceInSeconds: number): string {
  const [hours, minutes, seconds] = baseTime.split(':').map(Number)
  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  const adjustedSeconds = Math.max(0, totalSeconds + differenceInSeconds)

  const newHours = Math.floor(adjustedSeconds / 3600)
  const newMinutes = Math.floor((adjustedSeconds % 3600) / 60)
  const newSecs = adjustedSeconds % 60

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSecs).padStart(2, '0')}`
}

// Helper function to get time difference in seconds
function getTimeDifferenceInSeconds(predicted: string, actual: string): number {
  const [predHours, predMinutes, predSeconds] = predicted.split(':').map(Number)
  const [actHours, actMinutes, actSeconds] = actual.split(':').map(Number)

  const predTotalSeconds = predHours * 3600 + predMinutes * 60 + predSeconds
  const actTotalSeconds = actHours * 3600 + actMinutes * 60 + actSeconds

  return actTotalSeconds - predTotalSeconds
}

export default function SegmentAnalysis({
  type,
  athlete,
  checkpoints,
  getCheckpointTime,
  swimStartTimeString,
  getTimeDifference,
  getTimeDifferenceColor,
  predictedTotalTime,
  estimatedFinishTime,
}: SegmentAnalysisProps) {
  const getSwimDifference = () => {
    const swimFinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_finish")
    const swimFinishTime = swimFinishCheckpoint ? getCheckpointTime(swimFinishCheckpoint.id) : null

    if (swimFinishTime && swimStartTimeString) {
      const actualSwimTime = calculateElapsedTime(swimStartTimeString, swimFinishTime.actual_time)
      if (actualSwimTime && athlete.predicted_swim_time) {
        return getTimeDifferenceInSeconds(athlete.predicted_swim_time, actualSwimTime)
      }
    }
    return 0
  }

  const getBikeDifference = () => {
    const t1FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t1_finish")
    const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
    const t1Time = t1FinishCheckpoint ? getCheckpointTime(t1FinishCheckpoint.id) : null
    const t2Time = t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null

    if (t1Time && t2Time) {
      const actualBikeTime = calculateElapsedTime(t1Time.actual_time, t2Time.actual_time)
      if (actualBikeTime && athlete.predicted_bike_time) {
        return getTimeDifferenceInSeconds(athlete.predicted_bike_time, actualBikeTime)
      }
    }
    return 0
  }

  const getSegmentData = () => {
    switch (type) {
      case "swim": {
        const swimFinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_finish")
        const swimFinishTime = swimFinishCheckpoint ? getCheckpointTime(swimFinishCheckpoint.id) : null
        const actualTime =
          swimFinishTime && swimStartTimeString
            ? calculateElapsedTime(swimStartTimeString, swimFinishTime.actual_time)
            : null
        const totalElapsed =
          swimFinishTime && swimStartTimeString
            ? calculateElapsedTime(swimStartTimeString, swimFinishTime.actual_time)
            : null

        return {
          title: "Pływaie",
          bgColor: "bg-blue-50",
          textColor: "text-blue-800",
          accentColor: "text-blue-600",
          borderColor: "border-blue-200",
          predicted: `${formatTimeWithSeconds(athlete.predicted_swim_time)} (${calculateSwimPace(athlete.predicted_swim_time, athlete.template?.swim_distance || 0)}/100m)`,
          actual: actualTime
            ? `${actualTime} (${calculateSwimPace(actualTime, athlete.template?.swim_distance || 0)}/100m)`
            : "--:--:--",
          totalElapsed,
          predictedTime: athlete.predicted_swim_time,
          actualTime,
        }
      }
      case "bike": {
        const t1FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t1_finish")
        const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
        const t1Time = t1FinishCheckpoint ? getCheckpointTime(t1FinishCheckpoint.id) : null
        const t2Time = t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null
        const actualTime = t1Time && t2Time ? calculateElapsedTime(t1Time.actual_time, t2Time.actual_time) : null
        const totalElapsed =
          t2Time && swimStartTimeString ? calculateElapsedTime(swimStartTimeString, t2Time.actual_time) : null

        return {
          title: "Rower",
          bgColor: "bg-orange-50",
          textColor: "text-orange-800",
          accentColor: "text-orange-600",
          borderColor: "border-orange-200",
          predicted: `${formatTimeWithSeconds(athlete.predicted_bike_time)} (${calculateBikeSpeed(athlete.predicted_bike_time, athlete.template?.bike_distance || 0)} km/h)`,
          actual: actualTime
            ? `${actualTime} (${calculateBikeSpeed(actualTime, athlete.template?.bike_distance || 0)} km/h)`
            : "--:--:--",
          totalElapsed,
          predictedTime: athlete.predicted_bike_time,
          actualTime,
        }
      }
      case "run": {
        const t2FinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "t2_finish")
        const finishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "finish")
        const t2Time = t2FinishCheckpoint ? getCheckpointTime(t2FinishCheckpoint.id) : null
        const finishTime = finishCheckpoint ? getCheckpointTime(finishCheckpoint.id) : null
        const actualTime =
          t2Time && finishTime ? calculateElapsedTime(t2Time.actual_time, finishTime.actual_time) : null
        const totalElapsed =
          finishTime && swimStartTimeString ? calculateElapsedTime(swimStartTimeString, finishTime.actual_time) : null

        return {
          title: "Bieg",
          bgColor: "bg-red-50",
          textColor: "text-red-800",
          accentColor: "text-red-600",
          borderColor: "border-red-200",
          predicted: `${formatTimeWithSeconds(athlete.predicted_run_time)} (${calculateRunPace(athlete.predicted_run_time, athlete.template?.run_distance || 0)}/km)`,
          actual: actualTime
            ? `${actualTime} (${calculateRunPace(actualTime, athlete.template?.run_distance || 0)}/km)`
            : "--:--:--",
          totalElapsed,
          predictedTime: athlete.predicted_run_time,
          actualTime,
        }
      }
      case "total": {
        const finishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "finish")
        const finishTime = finishCheckpoint ? getCheckpointTime(finishCheckpoint.id) : null
        const actualTime =
          finishTime && swimStartTimeString ? calculateElapsedTime(swimStartTimeString, finishTime.actual_time) : null

        const swimDiff = getSwimDifference()
        const bikeDiff = getBikeDifference()
        const totalDiff = swimDiff + bikeDiff

        const adjustedTotalPredicted = predictedTotalTime && totalDiff !== 0
          ? adjustTimeByDifference(predictedTotalTime, totalDiff)
          : predictedTotalTime

        return {
          title: "Szacowany czas",
          bgColor: "bg-gray-50",
          textColor: "text-gray-800",
          accentColor: "text-gray-600",
          borderColor: "border-gray-200",
          predicted: adjustedTotalPredicted + (estimatedFinishTime ? ` \n\n(na mecie: ${estimatedFinishTime})` : ""),
          actual: actualTime || "--:--:--",
          totalElapsed: null,
          predictedTime: adjustedTotalPredicted,
          actualTime,
          totalDiff,
        }
      }
      default:
        return null
    }
  }

  const segmentData = getSegmentData()
  if (!segmentData) return null

  return (
    <div className={`p-4 ${segmentData.bgColor} rounded-lg`}>
      <div className="text-center mb-3">
        <h3 className={`font-semibold ${segmentData.textColor}`}>{segmentData.title}</h3>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Szacowany:</span>
          <span className={`font-medium ${segmentData.accentColor}`}>{segmentData.predicted}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Rzeczywisty:</span>
          <span className={`font-medium ${segmentData.accentColor}`}>{segmentData.actual}</span>
        </div>
        {segmentData.totalElapsed && (
          <div className="flex justify-between items-center">
            <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Minęło:</span>
            <span className={`font-medium ${segmentData.accentColor}`}>{segmentData.totalElapsed}</span>
          </div>
        )}
        {segmentData.actualTime && segmentData.predictedTime && (
          <div className={`flex justify-between items-center pt-2 border-t ${segmentData.borderColor}`}>
            <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Różnica:</span>
            <span className={`font-bold ${getTimeDifferenceColor(segmentData.predictedTime, segmentData.actualTime)}`}>
              {getTimeDifference(segmentData.predictedTime, segmentData.actualTime)}
            </span>
          </div>
        )}
      </div>
      {type === "total" && segmentData.totalDiff !== 0 && (
        <div className="mt-2 text-xs text-gray-600">
          * Przewidywany całkowity czas obliczony po pływaniu i rowerze
        </div>
      )}
    </div>
  )
}
