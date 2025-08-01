"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { validateTimeInput, calculatePredictedTotalTime } from "@/lib/supabase-utils"
import { toast } from "sonner"
import { useTemplates, useCreateAthlete } from "@/lib/queries"
import { Athlete } from "@/lib/supabase-types"


export function AthleteForm() {
  const { data: templates = [] } = useTemplates()
  const createAthleteMutation = useCreateAthlete()

  const [formData, setFormData] = useState({
    name: "",
    templateId: "",
    predictedSwimTime: "00:00:00",
    predictedBikeTime: "00:00:00",
    predictedRunTime: "00:00:00",
    predictedT1Time: "00:00:00",
    predictedT2Time: "00:00:00",
  })
  const [validationErrors, setValidationErrors] = useState({
    swim: "",
    templateId: "",
    bike: "",
    run: "",
    t1: "",
    t2: "",
  })

  // Calculate predicted total time
  const predictedTotalTime = calculatePredictedTotalTime({
    predicted_swim_time: formData.predictedSwimTime,
    predicted_bike_time: formData.predictedBikeTime,
    predicted_run_time: formData.predictedRunTime,
    predicted_t1_time: formData.predictedT1Time,
    predicted_t2_time: formData.predictedT2Time,
  } as Athlete)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some((error) => error !== "")
    if (hasErrors) {
      toast.error( "Please fix the time format errors before submitting")
      return
    }
    if (!formData.templateId) {
      toast.error( "Please select template")
      return
    }
    // Check for required predicted times (all are now required)
    if (
      !formData.predictedSwimTime ||
      !formData.predictedBikeTime ||
      !formData.predictedRunTime ||
      !formData.predictedT1Time ||
      !formData.predictedT2Time
    ) {
      toast.error( "All predicted times are required")
      return
    }

    try {
      // Format times for database
      const formatTimeForDatabase = (timeStr: string): string | null => {
        if (!timeStr) return null
        // Ensure format is HH:MM:SS
        if (timeStr.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
          return timeStr
        }
        if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
          return `${timeStr}:00`
        }
        return timeStr
      }

      await createAthleteMutation.mutateAsync({
        name: formData.name,
        template_id: Number.parseInt(formData.templateId),
        predicted_swim_time: formatTimeForDatabase(formData.predictedSwimTime),
        predicted_bike_time: formatTimeForDatabase(formData.predictedBikeTime),
        predicted_run_time: formatTimeForDatabase(formData.predictedRunTime),
        predicted_t1_time: formatTimeForDatabase(formData.predictedT1Time),
        predicted_t2_time: formatTimeForDatabase(formData.predictedT2Time),
      })

      toast.success("Athlete added successfully")

      setFormData({
        name: "",
        templateId: "",
        predictedSwimTime: "",
        predictedBikeTime: "",
        predictedRunTime: "",
        predictedT1Time: "",
        predictedT2Time: "",
      })

      setValidationErrors({ swim: "", bike: "", run: "", t1: "", t2: "",templateId:"" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add athlete");
    }
  }

  return (
    <Card>  
      <CardHeader>
        <CardTitle>Add New Athlete</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Athlete Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="template">Template</Label>
            <Select
              value={formData.templateId}
              onValueChange={(value) => setFormData({ ...formData, templateId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="predictedSwimTime">Predicted Swim Time (HH:MM:SS) *</Label>
              <Input
                id="predictedSwimTime"
                placeholder="01:30:00"
                value={formData.predictedSwimTime}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, predictedSwimTime: value })

                  const validation = validateTimeInput(value, "swim")
                  setValidationErrors((prev) => ({ ...prev, swim: validation.error || "" }))
                }}
                required
              />
              {validationErrors.swim && <p className="text-sm text-red-600 mt-1">{validationErrors.swim}</p>}
              <p className="text-xs text-gray-500 mt-1">Maximum: 2:30:00 (Required)</p>
            </div>

            <div>
              <Label htmlFor="predictedBikeTime">Predicted Bike Time (HH:MM:SS) *</Label>
              <Input
                id="predictedBikeTime"
                placeholder="02:30:00"
                value={formData.predictedBikeTime}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, predictedBikeTime: value })

                  const validation = validateTimeInput(value, "bike")
                  setValidationErrors((prev) => ({ ...prev, bike: validation.error || "" }))
                }}
                required
              />
              {validationErrors.bike && <p className="text-sm text-red-600 mt-1">{validationErrors.bike}</p>}
              <p className="text-xs text-gray-500 mt-1">Maximum: 8:00:00 (Required)</p>
            </div>

            <div>
              <Label htmlFor="predictedRunTime">Predicted Run Time (HH:MM:SS) *</Label>
              <Input
                id="predictedRunTime"
                placeholder="01:00:00"
                value={formData.predictedRunTime}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, predictedRunTime: value })

                  const validation = validateTimeInput(value, "run")
                  setValidationErrors((prev) => ({ ...prev, run: validation.error || "" }))
                }}
                required
              />
              {validationErrors.run && <p className="text-sm text-red-600 mt-1">{validationErrors.run}</p>}
              <p className="text-xs text-gray-500 mt-1">Maximum: 5:00:00 (Required)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="predictedT1Time">Predicted T1 Time (HH:MM:SS) *</Label>
              <Input
                id="predictedT1Time"
                placeholder="00:05:00"
                value={formData.predictedT1Time}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, predictedT1Time: value })

                  const validation = validateTimeInput(value, "transition")
                  setValidationErrors((prev) => ({ ...prev, t1: validation.error || "" }))
                }}
                required
              />
              {validationErrors.t1 && <p className="text-sm text-red-600 mt-1">{validationErrors.t1}</p>}
              <p className="text-xs text-gray-500 mt-1">Maximum: 30:00 (Required)</p>
            </div>

            <div>
              <Label htmlFor="predictedT2Time">Predicted T2 Time (HH:MM:SS) *</Label>
              <Input
                id="predictedT2Time"
                placeholder="00:03:00"
                value={formData.predictedT2Time}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, predictedT2Time: value })

                  const validation = validateTimeInput(value, "transition")
                  setValidationErrors((prev) => ({ ...prev, t2: validation.error || "" }))
                }}
                required
              />
              {validationErrors.t2 && <p className="text-sm text-red-600 mt-1">{validationErrors.t2}</p>}
              <p className="text-xs text-gray-500 mt-1">Maximum: 30:00 (Required)</p>
            </div>
          </div>

          {/* Calculated Total Time Display */}
          {predictedTotalTime !== "--:--:--" && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <Label className="text-sm font-medium text-gray-700">Predicted Total Time</Label>
                <div className="text-2xl font-bold text-gray-900 mt-1">{predictedTotalTime}</div>
                <p className="text-xs text-gray-500 mt-1">Automatically calculated from all components</p>
              </div>
            </div>
          )}

          <Button type="submit" disabled={createAthleteMutation.isPending} className="w-full">
            {createAthleteMutation.isPending ? "Adding..." : "Add Athlete"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
