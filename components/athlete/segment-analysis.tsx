import {
  calculateElapsedTime,
  formatTimeWithSeconds,
  calculateSwimPace,
  calculateBikeSpeed,
  calculateRunPace,
} from "@/lib/supabase"

interface SegmentAnalysisProps {
  type: "swim" | "bike" | "run" | "total"
  athlete: any
  checkpoints: any[]
  getCheckpointTime: (id: number) => any
  swimStartTime: any
  getTimeDifference: (predicted: string, actual: string) => string
  getTimeDifferenceColor: (predicted: string, actual: string) => string
  predictedTotalTime?: string
  estimatedFinishTime?: string | null
}

export default function SegmentAnalysis({
  type,
  athlete,
  checkpoints,
  getCheckpointTime,
  swimStartTime,
  getTimeDifference,
  getTimeDifferenceColor,
  predictedTotalTime,
  estimatedFinishTime,
}: SegmentAnalysisProps) {
  const getSegmentData = () => {
    switch (type) {
      case "swim": {
        const swimFinishCheckpoint = checkpoints.find((cp) => cp.checkpoint_type === "swim_finish")
        const swimFinishTime = swimFinishCheckpoint ? getCheckpointTime(swimFinishCheckpoint.id) : null
        const actualTime =
          swimFinishTime && swimStartTime
            ? calculateElapsedTime(swimStartTime.actual_time, swimFinishTime.actual_time)
            : null
        const totalElapsed =
          swimFinishTime && swimStartTime
            ? calculateElapsedTime(swimStartTime.actual_time, swimFinishTime.actual_time)
            : null

        return {
          title: "Swim",
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
          t2Time && swimStartTime ? calculateElapsedTime(swimStartTime.actual_time, t2Time.actual_time) : null

        return {
          title: "Bike",
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
          finishTime && swimStartTime ? calculateElapsedTime(swimStartTime.actual_time, finishTime.actual_time) : null

        return {
          title: "Run",
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
          finishTime && swimStartTime ? calculateElapsedTime(swimStartTime.actual_time, finishTime.actual_time) : null

        return {
          title: "Total Time",
          bgColor: "bg-gray-50",
          textColor: "text-gray-800",
          accentColor: "text-gray-600",
          borderColor: "border-gray-200",
          predicted: predictedTotalTime + (estimatedFinishTime ? ` (Est. finish: ${estimatedFinishTime})` : ""),
          actual: actualTime || "--:--:--",
          totalElapsed: null,
          predictedTime: predictedTotalTime,
          actualTime,
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
          <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Predicted:</span>
          <span className={`font-medium ${segmentData.accentColor}`}>{segmentData.predicted}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Actual:</span>
          <span className={`font-medium ${segmentData.accentColor}`}>{segmentData.actual}</span>
        </div>
        {segmentData.totalElapsed && (
          <div className="flex justify-between items-center">
            <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Total Elapsed:</span>
            <span className={`font-medium ${segmentData.accentColor}`}>{segmentData.totalElapsed}</span>
          </div>
        )}
        {segmentData.actualTime && segmentData.predictedTime && (
          <div className={`flex justify-between items-center pt-2 border-t ${segmentData.borderColor}`}>
            <span className={`text-sm ${segmentData.textColor.replace("800", "700")}`}>Difference:</span>
            <span className={`font-bold ${getTimeDifferenceColor(segmentData.predictedTime, segmentData.actualTime)}`}>
              {getTimeDifference(segmentData.predictedTime, segmentData.actualTime)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
