"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, RotateCcw, Upload, Save, Trash2 } from "lucide-react"

interface Point {
  x: number
  y: number
}

interface SwimRoute {
  points: Point[]
  distance: number // w metrach
}

interface Swimmer {
  id: string
  name: string
  pace: number // minuty na 100m
  startTime: Date
  color: string
}

export default function SwimTracker() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [swimRoute, setSwimRoute] = useState<SwimRoute | null>(null)
  const [currentRoute, setCurrentRoute] = useState<Point[]>([])
  const [routeDistance, setRouteDistance] = useState<number>(1500) // domyślnie 1500m

  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationTime, setSimulationTime] = useState(0) // sekundy od startu

  // Przykładowi pływacy
  const [swimmers] = useState<Swimmer[]>([
    { id: "1", name: "Jan Kowalski", pace: 2.0, startTime: new Date(), color: "#ef4444" },
    { id: "2", name: "Anna Nowak", pace: 1.8, startTime: new Date(), color: "#3b82f6" },
    { id: "3", name: "Piotr Wiśniewski", pace: 2.2, startTime: new Date(), color: "#10b981" },
  ])

  useEffect(() => {
    if (canvasRef.current && mapImage) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Ustaw rozmiar canvas
      const maxWidth = 800
      const maxHeight = 600
      const scale = Math.min(maxWidth / mapImage.width, maxHeight / mapImage.height, 1)

      canvas.width = mapImage.width * scale
      canvas.height = mapImage.height * scale

      // Narysuj obraz tła
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height)

      // Narysuj zapisaną trasę pływacką
      if (swimRoute && swimRoute.points.length > 1) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(swimRoute.points[0].x * scale, swimRoute.points[0].y * scale)
        swimRoute.points.forEach((point) => {
          ctx.lineTo(point.x * scale, point.y * scale)
        })
        ctx.stroke()

        // Narysuj punkt startu (zielony)
        ctx.fillStyle = "#10b981"
        ctx.beginPath()
        ctx.arc(swimRoute.points[0].x * scale, swimRoute.points[0].y * scale, 8, 0, 2 * Math.PI)
        ctx.fill()

        // Narysuj punkt mety (czerwony)
        const lastPoint = swimRoute.points[swimRoute.points.length - 1]
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(lastPoint.x * scale, lastPoint.y * scale, 8, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Narysuj aktualnie rysowaną trasę
      if (currentRoute.length > 1) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.setLineDash([5, 5]) // przerywana linia
        ctx.beginPath()
        ctx.moveTo(currentRoute[0].x * scale, currentRoute[0].y * scale)
        currentRoute.forEach((point) => {
          ctx.lineTo(point.x * scale, point.y * scale)
        })
        ctx.stroke()
        ctx.setLineDash([]) // reset
      }

      // Narysuj pływaków (jeśli symulacja jest włączona)
      if (isSimulating && swimRoute) {
        swimmers.forEach((swimmer, index) => {
          const position = calculateSwimmerPosition(swimmer)

          // Narysuj kropkę pływaka
          ctx.fillStyle = swimmer.color
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(position.x * scale, position.y * scale, 10, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()

          // Narysuj numer pływaka
          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 12px Arial"
          ctx.textAlign = "center"
          ctx.fillText((index + 1).toString(), position.x * scale, position.y * scale + 4)

          // Narysuj imię pływaka obok
          ctx.fillStyle = swimmer.color
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 3
          ctx.font = "14px Arial"
          ctx.strokeText(swimmer.name, position.x * scale + 20, position.y * scale - 15)
          ctx.fillText(swimmer.name, position.x * scale + 20, position.y * scale - 15)
        })
      }
    }
  }, [mapImage, swimRoute, currentRoute, isSimulating, simulationTime])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setMapImage(img)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mapImage) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = mapImage.width / canvas.width
    const scaleY = mapImage.height / canvas.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    setIsDrawing(true)
    setCurrentRoute([{ x, y }])
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !mapImage) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = mapImage.width / canvas.width
    const scaleY = mapImage.height / canvas.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    setCurrentRoute((prev) => [...prev, { x, y }])
  }

  const handleCanvasMouseUp = () => {
    setIsDrawing(false)
  }

  const saveSwimRoute = () => {
    if (currentRoute.length < 2) return

    const newRoute: SwimRoute = {
      points: [...currentRoute],
      distance: routeDistance,
    }

    setSwimRoute(newRoute)
    setCurrentRoute([])
  }

  const clearRoute = () => {
    setSwimRoute(null)
    setCurrentRoute([])
  }

  const calculateSwimmerPosition = (swimmer: Swimmer): Point => {
    if (!swimRoute || swimRoute.points.length < 2) {
      return { x: 50, y: 50 } // domyślna pozycja
    }

    // Oblicz ile metrów przepłynął pływak
    const timeInMinutes = simulationTime / 60
    const distanceSwum = (timeInMinutes / swimmer.pace) * 100 // metry

    // Oblicz procent ukończenia trasy (0-1)
    const progress = Math.min(1, distanceSwum / swimRoute.distance)

    // Znajdź pozycję na trasie
    const totalPoints = swimRoute.points.length
    const targetIndex = Math.floor(progress * (totalPoints - 1))
    const nextIndex = Math.min(targetIndex + 1, totalPoints - 1)

    if (targetIndex === nextIndex) {
      return swimRoute.points[targetIndex]
    }

    // Interpolacja między punktami
    const t = progress * (totalPoints - 1) - targetIndex
    const current = swimRoute.points[targetIndex]
    const next = swimRoute.points[nextIndex]

    return {
      x: current.x + (next.x - current.x) * t,
      y: current.y + (next.y - current.y) * t,
    }
  }

  const startSimulation = () => {
    setIsSimulating(true)
    setSimulationTime(0)
  }

  const pauseSimulation = () => {
    setIsSimulating(false)
  }

  const resetSimulation = () => {
    setIsSimulating(false)
    setSimulationTime(0)
  }

  // Symulacja czasu - przyspieszenie 10x
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSimulating) {
      interval = setInterval(() => {
        setSimulationTime((prev) => prev + 10) // +10 sekund co sekundę
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSimulating])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const calculateExpectedTime = (swimmer: Swimmer): string => {
    if (!swimRoute) return "00:00"
    const totalMinutes = (swimRoute.distance / 100) * swimmer.pace
    return formatTime(Math.round(totalMinutes * 60))
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Swim Tracker</h1>
        <p className="text-muted-foreground">Symulacja pływania na żywo</p>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup">Konfiguracja</TabsTrigger>
          <TabsTrigger value="live">Podgląd Na Żywo</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfiguracja Trasy Pływackiej</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="map-upload">Wgraj mapę trasy</Label>
                  <Input id="map-upload" type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} />
                </div>
                <div>
                  <Label htmlFor="distance">Długość trasy (metry)</Label>
                  <Input
                    id="distance"
                    type="number"
                    value={routeDistance}
                    onChange={(e) => setRouteDistance(Number(e.target.value))}
                    placeholder="1500"
                  />
                </div>
              </div>

              {mapImage && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={saveSwimRoute} disabled={currentRoute.length < 2}>
                      <Save className="w-4 h-4 mr-2" />
                      Zapisz trasę
                    </Button>
                    <Button variant="destructive" onClick={clearRoute}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Wyczyść
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      className="cursor-crosshair max-w-full h-auto"
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Kliknij i przeciągnij myszką, aby narysować trasę pływacką. Zielony punkt = start, czerwony punkt =
                    meta.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Konfiguracja pływaków */}
          <Card>
            <CardHeader>
              <CardTitle>Pływacy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {swimmers.map((swimmer, index) => (
                  <div key={swimmer.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: swimmer.color }} />
                      <h3 className="font-semibold">{swimmer.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Tempo: {swimmer.pace} min/100m</p>
                    <p className="text-sm text-muted-foreground">Oczekiwany czas: {calculateExpectedTime(swimmer)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Podgląd Na Żywo
                <div className="flex gap-2">
                  <Button onClick={startSimulation} disabled={isSimulating || !swimRoute}>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                  <Button onClick={pauseSimulation} disabled={!isSimulating}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pauza
                  </Button>
                  <Button onClick={resetSimulation}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {swimRoute ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold">Czas: {formatTime(simulationTime)}</p>
                    <p className="text-sm text-muted-foreground">Trasa: {swimRoute.distance}m (przyspieszenie 10x)</p>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <canvas ref={canvasRef} className="max-w-full h-auto" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {swimmers.map((swimmer, index) => {
                      const timeInMinutes = simulationTime / 60
                      const distanceSwum = (timeInMinutes / swimmer.pace) * 100
                      const progress = Math.min(100, (distanceSwum / swimRoute.distance) * 100)

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
                            <p className="text-sm">Tempo: {swimmer.pace} min/100m</p>
                            <p className="text-sm">Dystans: {Math.round(distanceSwum)}m</p>
                            <p className="text-sm">Postęp: {progress.toFixed(1)}%</p>
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
                    Skonfiguruj trasę pływacką w zakładce "Konfiguracja", aby rozpocząć symulację
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
