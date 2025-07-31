"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateTemplate } from "@/lib/queries"
import type { Template } from "@/lib/supabase-utils"

interface BasicInfoTabProps {
  template: Template
}

export function BasicInfoTab({ template }: BasicInfoTabProps) {
  const { data: updateTemplate } = useUpdateTemplate()

  const updateSegmentLaps = (segment: "swim" | "bike" | "run", laps: number) => {
    const routeDataKey = `${segment}_route_data` as keyof Template
    const currentRouteData = template[routeDataKey] as any

    if (currentRouteData) {
      updateTemplate({
        ...template,
        [routeDataKey]: {
          ...currentRouteData,
          laps: laps,
        },
      })
    } else {
      // Create default route data with laps if none exists
      updateTemplate({
        ...template,
        [routeDataKey]: {
          points: [],
          color: segment === "swim" ? "#3b82f6" : segment === "bike" ? "#10b981" : "#ef4444",
          laps: laps,
        },
      })
    }
  }

  const getSegmentLaps = (segment: "swim" | "bike" | "run"): number => {
    const routeDataKey = `${segment}_route_data` as keyof Template
    const routeData = template[routeDataKey] as any
    return routeData?.laps || 1
  }

  const getDistancePerLap = (segment: "swim" | "bike" | "run"): number => {
    const distance = template[`${segment}_distance` as keyof Template] as number
    const laps = getSegmentLaps(segment)
    return distance / laps
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={template.name}
              onChange={(e) => updateTemplate({ ...template, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Swim Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-600">Swimming</h3>
              <div>
                <Label htmlFor="swim-distance">Total Distance (km)</Label>
                <Input
                  id="swim-distance"
                  type="number"
                  step="0.1"
                  value={template.swim_distance}
                  onChange={(e) => updateTemplate({ ...template, swim_distance: Number.parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="swim-laps">Number of Laps</Label>
                <Input
                  id="swim-laps"
                  type="number"
                  min="1"
                  value={getSegmentLaps("swim")}
                  onChange={(e) => updateSegmentLaps("swim", Number.parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Distance per lap: {getDistancePerLap("swim").toFixed(2)}km
                </p>
              </div>
            </div>

            {/* Bike Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-green-600">Biking</h3>
              <div>
                <Label htmlFor="bike-distance">Total Distance (km)</Label>
                <Input
                  id="bike-distance"
                  type="number"
                  step="0.1"
                  value={template.bike_distance}
                  onChange={(e) => updateTemplate({ ...template, bike_distance: Number.parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="bike-laps">Number of Laps</Label>
                <Input
                  id="bike-laps"
                  type="number"
                  min="1"
                  value={getSegmentLaps("bike")}
                  onChange={(e) => updateSegmentLaps("bike", Number.parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Distance per lap: {getDistancePerLap("bike").toFixed(2)}km
                </p>
              </div>
            </div>

            {/* Run Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-red-600">Running</h3>
              <div>
                <Label htmlFor="run-distance">Total Distance (km)</Label>
                <Input
                  id="run-distance"
                  type="number"
                  step="0.1"
                  value={template.run_distance}
                  onChange={(e) => updateTemplate({ ...template, run_distance: Number.parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="run-laps">Number of Laps</Label>
                <Input
                  id="run-laps"
                  type="number"
                  min="1"
                  value={getSegmentLaps("run")}
                  onChange={(e) => updateSegmentLaps("run", Number.parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Distance per lap: {getDistancePerLap("run").toFixed(2)}km
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How Laps Work:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Draw the route once - it represents one complete lap</li>
              <li>• Athletes will repeat this route for the specified number of laps</li>
              <li>• Total distance = Distance per lap × Number of laps</li>
              <li>• Checkpoints can be placed at specific laps and distances</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}