/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useUpdateTemplate } from "@/lib/queries"
import type { Template } from "@/lib/supabase-types"

interface BasicInfoTabProps {
  template: Template
}

interface FormData {
  name: string
  swim_distance: number
  bike_distance: number
  run_distance: number
  swim_laps: number
  bike_laps: number
  run_laps: number
}

export function BasicInfoTab({ template }: BasicInfoTabProps) {
  const { mutate: updateTemplate, isPending } = useUpdateTemplate()

  const [formData, setFormData] = useState<FormData>(() => {
    const getSegmentLaps = (segment: "swim" | "bike" | "run"): number => {
      const routeDataKey = `${segment}_route_data` as keyof Template
      const routeData = template[routeDataKey] as any
      return routeData?.laps || 1
    }

    return {
      name: template.name,
      swim_distance: template.swim_distance || 0,
      bike_distance: template.bike_distance || 0,
      run_distance: template.run_distance || 0,
      swim_laps: getSegmentLaps("swim"),
      bike_laps: getSegmentLaps("bike"),
      run_laps: getSegmentLaps("run"),
    }
  })

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveTemplate = () => {
    console.log(formData)
    const updatedTemplate = {
      ...template,
      name: formData.name,
      swim_distance: formData.swim_distance,
      bike_distance: formData.bike_distance,
      run_distance: formData.run_distance,
      swim_route_data: {
        ...((template.swim_route_data as any) || {}),
        laps: formData.swim_laps,
        points: (template.swim_route_data as any)?.points || [],
        color: (template.swim_route_data as any)?.color || "#3b82f6",
      },
      bike_route_data: {
        ...((template.bike_route_data as any) || {}),
        laps: formData.bike_laps,
        points: (template.bike_route_data as any)?.points || [],
        color: (template.bike_route_data as any)?.color || "#10b981",
      },
      run_route_data: {
        ...((template.run_route_data as any) || {}),
        laps: formData.run_laps,
        points: (template.run_route_data as any)?.points || [],
        color: (template.run_route_data as any)?.color || "#ef4444",
      },
    }

    updateTemplate(updatedTemplate)
  }

  const getDistancePerLap = (segment: "swim" | "bike" | "run"): number => {
    const distance = formData[`${segment}_distance` as keyof FormData] as number
    const laps = formData[`${segment}_laps` as keyof FormData] as number
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
            <Input id="name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
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
                  step="0.01"
                  value={formData.swim_distance}
                  onChange={(e) => handleInputChange("swim_distance", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="swim-laps">Number of Laps</Label>
                <Input
                  id="swim-laps"
                  type="number"
                  min="1"
                  value={formData.swim_laps}
                  onChange={(e) => handleInputChange("swim_laps", Number.parseInt(e.target.value) || 1)}
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
                  value={formData.bike_distance}
                  onChange={(e) => handleInputChange("bike_distance", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="bike-laps">Number of Laps</Label>
                <Input
                  id="bike-laps"
                  type="number"
                  min="1"
                  value={formData.bike_laps}
                  onChange={(e) => handleInputChange("bike_laps", Number.parseInt(e.target.value) || 1)}
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
                  value={formData.run_distance}
                  onChange={(e) => handleInputChange("run_distance", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="run-laps">Number of Laps</Label>
                <Input
                  id="run-laps"
                  type="number"
                  min="1"
                  value={formData.run_laps}
                  onChange={(e) => handleInputChange("run_laps", Number.parseInt(e.target.value) || 1)}
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

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveTemplate} disabled={isPending} className="min-w-32">
              {isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
