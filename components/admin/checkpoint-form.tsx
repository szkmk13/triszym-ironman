"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import type { TemplateCheckpoint } from "@/lib/supabase-utils"

interface CheckpointFormProps {
  templateId: number
  checkpoints: TemplateCheckpoint[]
  onSubmit: (data: any) => void
  onCancel?: () => void
  loading: boolean
}

export function CheckpointForm({ templateId, checkpoints, onSubmit, onCancel, loading }: CheckpointFormProps) {
  const getAvailableCheckpointTypes = (excludeCheckpointId?: number) => {
    const allTypes = [
      { value: "swim_start", label: "Swim Start" },
      { value: "swim_finish", label: "Swim Finish" },
      { value: "t1_finish", label: "T1 Finish" },
      { value: "bike_checkpoint", label: "Bike Checkpoint" },
      { value: "t2_finish", label: "T2 Finish" },
      { value: "run_checkpoint", label: "Run Checkpoint" },
      { value: "finish", label: "Finish" },
    ]

    const existingTypes = checkpoints.filter((cp) => cp.id !== excludeCheckpointId).map((cp) => cp.checkpoint_type)

    const uniqueTypes = ["swim_start", "swim_finish", "t1_finish", "t2_finish", "finish"]

    return allTypes.filter((type) => {
      if (uniqueTypes.includes(type.value)) {
        return !existingTypes.includes(type.value)
      }
      return true
    })
  }

  const availableTypes = getAvailableCheckpointTypes()
  const defaultType = availableTypes.length > 0 ? availableTypes[0].value : "bike_checkpoint"

  const [formData, setFormData] = useState({
    checkpoint_type: defaultType,
    name: availableTypes.length > 0 ? availableTypes[0].label : "Bike Checkpoint",
    distance_km: 0,
    order_index: checkpoints.length + 1,
  })

  useEffect(() => {
    const newAvailableTypes = getAvailableCheckpointTypes()
    if (newAvailableTypes.length > 0 && !newAvailableTypes.some((type) => type.value === formData.checkpoint_type)) {
      const newDefaultType = newAvailableTypes[0]
      setFormData((prev) => ({
        ...prev,
        checkpoint_type: newDefaultType.value,
        name: newDefaultType.label,
      }))
    }
  }, [checkpoints])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)

    const newAvailableTypes = getAvailableCheckpointTypes()
    const newDefaultType = newAvailableTypes.length > 0 ? newAvailableTypes[0].value : "bike_checkpoint"

    setFormData({
      checkpoint_type: newDefaultType,
      name: newAvailableTypes.length > 0 ? newAvailableTypes[0].label : "Bike Checkpoint",
      distance_km: 0,
      order_index: checkpoints.length + 2,
    })
  }

  const handleCheckpointTypeChange = (newType: string) => {
    const selectedType = availableTypes.find((type) => type.value === newType)
    setFormData({
      ...formData,
      checkpoint_type: newType,
      name: selectedType
        ? selectedType.label
        : newType
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
    })
  }

  if (availableTypes.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-500">
        All checkpoint types have been added to this template.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium text-sm">Add New Checkpoint</h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="checkpointType">Type</Label>
          <select
            id="checkpointType"
            className="w-full p-2 border rounded-md"
            value={formData.checkpoint_type}
            onChange={(e) => handleCheckpointTypeChange(e.target.value)}
            required
          >
            {availableTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="checkpointName">Name</Label>
          <Input
            id="checkpointName"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="checkpointDistance">Distance (km)</Label>
          <Input
            id="checkpointDistance"
            type="number"
            step="0.1"
            value={formData.distance_km}
            onChange={(e) => setFormData({ ...formData, distance_km: Number.parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="checkpointOrder">Order</Label>
          <Input
            id="checkpointOrder"
            type="number"
            value={formData.order_index}
            onChange={(e) => setFormData({ ...formData, order_index: Number.parseInt(e.target.value) })}
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Checkpoint
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
