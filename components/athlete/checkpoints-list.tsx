import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CheckpointItem from "./checkpoint-item"

interface CheckpointsListProps {
  checkpoints: any[]
  athlete: any
  getCheckpointTime: (id: number) => any
  swimStartTime: any
  currentTime: string
  onRecordTime: (checkpointId: number, timeString?: string) => void
  isRecording: boolean
}

export default function CheckpointsList({
  checkpoints,
  athlete,
  getCheckpointTime,
  swimStartTime,
  currentTime,
  onRecordTime,
  isRecording,
}: CheckpointsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Race Progress</CardTitle>
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
              swimStartTime={swimStartTime}
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
