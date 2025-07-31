"use client"

import type React from "react"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Palette, Trash2, MapPin } from "lucide-react"
import type { Template, TemplateCheckpoint, RouteData } from "@/lib/supabase"

interface RoutePoint {
  x: number
  y: number
}

const SEGMENT_COLORS = {
  swim: "#3b82f6",
  bike: "#10b981",
  run: "#ef4444",
}

const SEGMENT_NAMES = {
  swim: "Pływanie",
  bike: "Rower",
  run: "Bieg",
}

type SegmentType = "swim" | "bike" | "run"

interface RouteMapsTabProps {
  template: Template
  checkpoints: TemplateCheckpoint[]
  currentSegment: SegmentType
  onSegmentChange: (segment: SegmentType) => void
  mapImages: { [key in SegmentType]?: HTMLImageElement }
  currentRoute: RoutePoint[]
  canvasRef: React.RefObject<HTMLCanvasElement>
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCanvasMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void
  onCanvasMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void
  onCanvasMouseUp: () => void
  onSaveCurrentRoute: () => void
  onClearCurrentRoute: () => void
  getCheckpointColor: (checkpoint: TemplateCheckpoint) => string
}

export function RouteMapsTab({
  template,
  checkpoints,
  currentSegment,
  onSegmentChange,
  mapImages,
  currentRoute,
  canvasRef,
  onImageUpload,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onSaveCurrentRoute,
  onClearCurrentRoute,
  getCheckpointColor,
}: RouteMapsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getCurrentSegmentData = () => {
    if (!template) return null
    return {
      mapUrl: template[`${currentSegment}_map_url` as keyof Template] as string,
      routeData: template[`${currentSegment}_route_data` as keyof Template] as RouteData,
    }
  }

  const getCurrentSegmentCheckpoints = () => {
    return checkpoints.filter((cp) => cp.checkpoint_type.startsWith(currentSegment))
  }

  const getSegmentLaps = (segment: SegmentType): number => {
    const routeData = template[`${segment}_route_data` as keyof Template] as RouteData
    return routeData?.laps || 1
  }

  const getDistancePerLap = (segment: SegmentType): number => {
    const distance = template[`${segment}_distance` as keyof Template] as number
    const laps = getSegmentLaps(segment)
    return distance / laps
  }

  const segmentData = getCurrentSegmentData()
  const segmentCheckpoints = getCurrentSegmentCheckpoints()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Route Maps Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <Label>Current Segment</Label>
              <Select value={currentSegment} onValueChange={onSegmentChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="swim">Pływanie</SelectItem>
                  <SelectItem value="bike">Rower</SelectItem>
                  <SelectItem value="run">Bieg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Badge style={{ backgroundColor: SEGMENT_COLORS[currentSegment], color: "white" }}>
                {SEGMENT_NAMES[currentSegment]}
              </Badge>
              {segmentCheckpoints.length > 0 && (
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  {segmentCheckpoints.length} checkpoints
                </Badge>
              )}
              {segmentData?.routeData && (
                <Badge variant="outline">
                  {getSegmentLaps(currentSegment)} laps × {getDistancePerLap(currentSegment).toFixed(2)}km
                </Badge>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="map-upload">Upload Map for {SEGMENT_NAMES[currentSegment]}</Label>
            <Input id="map-upload" type="file" accept="image/*" onChange={onImageUpload} ref={fileInputRef} />
            {segmentData?.mapUrl && (
              <p className="text-sm text-green-600 mt-1">✓ Map already uploaded for this segment</p>
            )}
          </div>

          {mapImages[currentSegment] && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveCurrentRoute} disabled={currentRoute.length < 2}>
                  <Palette className="w-4 h-4 mr-2" />
                  Save Route
                </Button>
                <Button size="sm" variant="destructive" onClick={onClearCurrentRoute}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Route
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  onMouseDown={onCanvasMouseDown}
                  onMouseMove={onCanvasMouseMove}
                  onMouseUp={onCanvasMouseUp}
                  className="cursor-crosshair max-w-full h-auto"
                />
              </div>

              {segmentData?.routeData && (
                <div className="flex items-center gap-2">
                  <Badge style={{ backgroundColor: segmentData.routeData.color, color: "white" }}>
                    ✓ Route saved for {SEGMENT_NAMES[currentSegment]}
                  </Badge>
                  <Badge variant="outline">
                    {segmentData.routeData.laps} lap{segmentData.routeData.laps > 1 ? "s" : ""}
                  </Badge>
                </div>
              )}

              {segmentCheckpoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Checkpoints on this route:</h4>
                  <div className="flex flex-wrap gap-2">
                    {segmentCheckpoints.map((checkpoint) => (
                      <Badge
                        key={checkpoint.id}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: getCheckpointColor(checkpoint) }}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {checkpoint.name}
                        {checkpoint.distance_km !== null && ` (${checkpoint.distance_km}km)`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Click and drag to draw the route for {SEGMENT_NAMES[currentSegment]}. This represents one lap - athletes
                will repeat this route {getSegmentLaps(currentSegment)} time
                {getSegmentLaps(currentSegment) > 1 ? "s" : ""}.
              </p>
            </div>
          )}

          {/* Overview of all segments */}
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Segments Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["swim", "bike", "run"] as SegmentType[]).map((segment) => {
                const hasMap = template[`${segment}_map_url` as keyof Template]
                const hasRoute = template[`${segment}_route_data` as keyof Template]
                const segmentCps = checkpoints.filter((cp) => cp.checkpoint_type.startsWith(segment))
                const laps = getSegmentLaps(segment)
                const distancePerLap = getDistancePerLap(segment)
                return (
                  <Card key={segment} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: SEGMENT_COLORS[segment] }} />
                      <h5 className="font-semibold">{SEGMENT_NAMES[segment]}</h5>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className={hasMap ? "text-green-600" : "text-gray-500"}>
                        {hasMap ? "✓ Map uploaded" : "○ No map"}
                      </p>
                      <p className={hasRoute ? "text-green-600" : "text-gray-500"}>
                        {hasRoute ? "✓ Route drawn" : "○ No route"}
                      </p>
                      <p className="text-blue-600">
                        {laps} lap{laps > 1 ? "s" : ""} × {distancePerLap.toFixed(2)}km
                      </p>
                      <p className={segmentCps.length > 0 ? "text-blue-600" : "text-gray-500"}>
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {segmentCps.length} checkpoints
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
