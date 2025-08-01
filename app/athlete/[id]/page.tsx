"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAthlete, useCheckpoints, useAthleteTimes, useRecordTime } from "@/lib/queries"
import AthleteHeader from "@/components/athlete/athlete-header"
import PerformanceAnalysis from "@/components/athlete/performance-analysis"
import TimeRecorder from "@/components/athlete/time-recorder"
import CheckpointsList from "@/components/athlete/checkpoints-list"

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = Number.parseInt(params.id as string)

  const { data: athlete, isLoading: athleteLoading } = useAthlete(athleteId)
  const { data: checkpoints = [] } = useCheckpoints(athlete?.template_id || 0)
  const { data: athleteTimes = [] } = useAthleteTimes(athleteId)
  const recordTimeMutation = useRecordTime()

  const [currentTime, setCurrentTime] = useState("")

  const recordTime = async (checkpointId: number, directTime?: string) => {
    const timeToRecord = directTime || currentTime

    if (!timeToRecord) return

    try {
      let timestamp: Date

      if (directTime) {
        // Direct time is already an ISO string
        timestamp = new Date(directTime)
      } else {
        // Manual time input - validate format
        const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/
        if (!timeRegex.test(timeToRecord)) return

        const today = new Date()
        const [hours, minutes, seconds] = timeToRecord.split(":").map(Number)
        timestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds)
      }

      await recordTimeMutation.mutateAsync({
        athlete_id: athleteId,
        checkpoint_id: checkpointId,
        actual_time: timestamp.toISOString(),
      })

      if (!directTime) {
        setCurrentTime("")
      }
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
  const swimStartTimeString = swimStartTime?.actual_time 

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AthleteHeader athlete={athlete} swimStartTimeString={swimStartTimeString} onBack={() => router.back()} />

      <PerformanceAnalysis
        athlete={athlete}
        checkpoints={checkpoints}
        getCheckpointTime={getCheckpointTime}
        swimStartTimeString={swimStartTimeString}
      />

      <TimeRecorder
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
      />

      <CheckpointsList
        checkpoints={checkpoints}
        athlete={athlete}
        getCheckpointTime={getCheckpointTime}
        swimStartTimeString={swimStartTimeString}
        currentTime={currentTime}
        onRecordTime={recordTime}
        isRecording={recordTimeMutation.isPending}
      />
    </div>
  )
}
