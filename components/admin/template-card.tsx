"use client"

import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import type { Template } from "@/lib/supabase-utils"

interface TemplateCardProps {
  template: Template
  checkpointCount: number
  onEdit: (template: Template) => void
  onDelete: (templateId: number) => void
  loading: boolean
}

export function TemplateCard({ template, checkpointCount, onEdit, onDelete, loading }: TemplateCardProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold">{template.name}</h3>
        <p className="text-sm text-gray-600">
          Swim: {template.swim_distance}km • Bike: {template.bike_distance}km • Run: {template.run_distance}km
        </p>
        <p className="text-xs text-gray-500">Checkpoints: {checkpointCount}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(template.id)} disabled={loading}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
