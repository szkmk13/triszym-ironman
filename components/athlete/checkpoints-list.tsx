import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CheckpointItem from "./checkpoint-item"
import { Athlete, AthleteTime, TemplateCheckpoint } from "@/lib/supabase-types"

interface CheckpointsListProps {
  checkpoints: TemplateCheckpoint[]
  athlete: Athlete
  getCheckpointTime: (id: number) => AthleteTime|undefined
  swimStartTimeString: string|undefined
  currentTime: string
  onRecordTime: (checkpointId: number, timeString?: string) => void
  isRecording: boolean
}

export default function CheckpointsList({
  checkpoints,
  athlete,
  getCheckpointTime,
  swimStartTimeString,
  currentTime,
  onRecordTime,
  isRecording,
}: CheckpointsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progres zawodów</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checkpoints.map((checkpoint) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              athlete={athlete}
              checkpoints={checkpoints}
              getCheckpointTime={getCheckpointTime}
              swimStartTimeString={swimStartTimeString}
              currentTime={currentTime}
              onRecordTime={onRecordTime}
              isRecording={isRecording}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
