"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase, type Template, validateTimeInput } from "@/lib/supabase"
import { toast } from "sonner"

interface AthleteFormProps {
  onAthleteAdded: () => void
}

export function AthleteForm({ onAthleteAdded }: AthleteFormProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [formData, setFormData] = useState({
    name: "",
    templateId: "",
    predictedSwimTime: "",
    predictedBikeTime: "",
    predictedRunTime: "",
  })
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({
    swim: "",
    bike: "",
    run: "",
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from("templates").select("*").order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      })
    } else {
      setTemplates(data || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some((error) => error !== "")
    if (hasErrors) {
      toast({
        title: "Validation Error",
        description: "Please fix the time format errors before submitting",
        variant: "destructive",
      })
      return
    }

    // Check for required predicted times
    if (!formData.predictedSwimTime || !formData.predictedBikeTime || !formData.predictedRunTime) {
      toast({
        title: "Validation Error",
        description: "All predicted times are required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // In the handleSubmit function, before inserting to database, format the times:
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

      const { error } = await supabase.from("athletes").insert({
        name: formData.name,
        template_id: Number.parseInt(formData.templateId),
        predicted_swim_time: formatTimeForDatabase(formData.predictedSwimTime),
        predicted_bike_time: formatTimeForDatabase(formData.predictedBikeTime),
        predicted_run_time: formatTimeForDatabase(formData.predictedRunTime),
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Athlete added successfully",
      })

      setFormData({
        name: "",
        templateId: "",
        predictedSwimTime: "",
        predictedBikeTime: "",
        predictedRunTime: "",
      })

      setValidationErrors({ swim: "", bike: "", run: "" })
      onAthleteAdded()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add athlete",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Athlete"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
