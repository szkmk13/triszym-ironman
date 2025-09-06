"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play } from "lucide-react"

interface TimeRecorderProps {
  currentTime: string
  setCurrentTime: (time: string) => void
}

export default function TimeRecorder({ currentTime, setCurrentTime }: TimeRecorderProps) {
  const handleSetCurrentTime = () => {
    const now = new Date()
    const timeString = now.toTimeString().slice(0, 8)
    setCurrentTime(timeString)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejestruj czas</CardTitle>
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
            Teraz
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Wpisz czas w formacie HH:MM:SS lub naciśnij &quot;Teraz&quot; żeby wpisać akutalny czas. Następnie zjedź niżej i kliknij &quot;rejestruj&quot; aby przypisać ten czas do checkpointu</p>
      </CardContent>
    </Card>
  )
}
