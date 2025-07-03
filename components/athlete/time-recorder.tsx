"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play } from "lucide-react"

interface TimeRecorderProps {
  currentTime: string
  setCurrentTime: (time: string) => void
  isRecording: boolean
}

export default function TimeRecorder({ currentTime, setCurrentTime, isRecording }: TimeRecorderProps) {
  const handleSetCurrentTime = () => {
    const now = new Date()
    const timeString = now.toTimeString().slice(0, 8)
    setCurrentTime(timeString)
  }

  return (
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
          <Button onClick={handleSetCurrentTime} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Now
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Enter time in HH:MM:SS format or click "Now" for current time</p>
      </CardContent>
    </Card>
  )
}
