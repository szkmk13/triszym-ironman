"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Save, X } from "lucide-react"
import type { TemplateCheckpoint } from "@/lib/supabase-utils"

interface CheckpointItemProps {
  checkpoint: TemplateCheckpoint
  templateId: number
  onUpdate: (checkpoint: TemplateCheckpoint) => void
  onDelete: (checkpointId: number, templateId: number) => void
  loading: boolean
}

export function CheckpointItem({ checkpoint, templateId, onUpdate, onDelete, loading }: CheckpointItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingCheckpoint, setEditingCheckpoint] = useState<TemplateCheckpoint>(checkpoint)

  const getCheckpointTypeColor = (type: string) => {
    switch (type) {
      case "swim_start":
      case "swim_finish":
        return "bg-blue-100 text-blue-800"
      case "t1_finish":
      case "t2_finish":
        return "bg-yellow-100 text-yellow-800"
      case "bike_checkpoint":
        return "bg-orange-100 text-orange-800"
      case "run_checkpoint":
      case "finish":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatCheckpointTypeName = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const handleSave = () => {
    onUpdate(editingCheckpoint)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditingCheckpoint(checkpoint)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="border rounded-lg p-3">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              className="w-full p-2 border rounded-md"
              value={editingCheckpoint.checkpoint_type}
              onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, checkpoint_type: e.target.value })}
            >
              <option value={editingCheckpoint.checkpoint_type}>
                {formatCheckpointTypeName(editingCheckpoint.checkpoint_type)}
              </option>
            </select>
            <Input
              placeholder="Checkpoint Name"
              value={editingCheckpoint.name}
              onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, name: e.target.value })}
            />
            <Input
              type="number"
              step="0.1"
              placeholder="Distance (km)"
              value={editingCheckpoint.distance_km || 0}
              onChange={(e) =>
                setEditingCheckpoint({
                  ...editingCheckpoint,
                  distance_km: Number.parseFloat(e.target.value),
                })
              }
            />
            <Input
              type="number"
              placeholder="Order"
              value={editingCheckpoint.order_index}
              onChange={(e) =>
                setEditingCheckpoint({
                  ...editingCheckpoint,
                  order_index: Number.parseInt(e.target.value),
                })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={getCheckpointTypeColor(checkpoint.checkpoint_type)}>
            {checkpoint.checkpoint_type.replace("_", " ")}
          </Badge>
          <div>
            <span className="font-medium">{checkpoint.name}</span>
            {checkpoint.distance_km && <span className="text-sm text-gray-500 ml-2">({checkpoint.distance_km}km)</span>}
            <span className="text-xs text-gray-400 ml-2">Order: {checkpoint.order_index}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(checkpoint.id, templateId)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
