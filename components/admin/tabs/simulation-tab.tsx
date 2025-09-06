"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, RotateCcw, Upload } from "lucide-react"
import { Template } from "@/lib/supabase-types"

interface Swimmer {
  id: string
  name: string
  pace: number
  startTime: Date
  color: string
}

interface SimulationTabProps {
  template: Template
  swimmers: Swimmer[]
  isSimulating: boolean
  simulationTime: number
  canvasRef: React.RefObject<HTMLCanvasElement>
  onStartSimulation: () => void
  onPauseSimulation: () => void
  onResetSimulation: () => void
  formatTime: (seconds: number) => string
  hasSwimRoute: boolean
}

export function SimulationTab({
  template,
  swimmers,
  isSimulating,
  simulationTime,
  canvasRef,
  onStartSimulation,
  onPauseSimulation,
  onResetSimulation,
  formatTime,
  hasSwimRoute,
}: SimulationTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Podgląd na żywo - Pływanie
            <div className="flex gap-2">
              <Button onClick={onStartSimulation} disabled={isSimulating || !hasSwimRoute} size="sm">
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
              <Button onClick={onPauseSimulation} disabled={!isSimulating} size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={onResetSimulation} size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasSwimRoute ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold">Simulation Time: {formatTime(simulationTime)}</p>
                <p className="text-sm text-muted-foreground">
                  Swimming Distance: {template.swim_distance}km (10x speed)
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <canvas ref={canvasRef} className="max-w-full h-auto" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {swimmers.map((swimmer, index) => {
                  const timeInMinutes = simulationTime / 60
                  const distanceSwum = (timeInMinutes / swimmer.pace) * 100
                  const swimDistance = template.swim_distance * 1000
                  const progress = Math.min(100, (distanceSwum / swimDistance) * 100)

                  return (
                    <Card key={swimmer.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: swimmer.color }}
                          >
                            {index + 1}
                          </div>
                          <h3 className="font-semibold">{swimmer.name}</h3>
                        </div>
                        <p className="text-sm">Pace: {swimmer.pace} min/100m</p>
                        <p className="text-sm">Distance: {Math.round(distanceSwum)}m</p>
                        <p className="text-sm">Progress: {progress.toFixed(1)}%</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="h-2 rounded-full transition-all duration-1000"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: swimmer.color,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Configure a swim map and draw the swimming route to enable live preview
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
