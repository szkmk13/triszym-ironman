"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, X, Trash2 } from "lucide-react"
import { CheckpointForm } from "./checkpoint-form"
import { CheckpointItem } from "./checkpoint-item"
import type { Template, TemplateCheckpoint } from "@/lib/supabase"

interface TemplateEditorProps {
  template: Template
  checkpoints: TemplateCheckpoint[]
  onUpdateTemplate: (template: Template) => void
  onDeleteTemplate: (templateId: number) => void
  onCreateCheckpoint: (templateId: number, checkpointData: any) => void
  onUpdateCheckpoint: (checkpoint: TemplateCheckpoint) => void
  onDeleteCheckpoint: (checkpointId: number, templateId: number) => void
  onCancel: () => void
  loading: boolean
}

export function TemplateEditor({
  template,
  checkpoints,
  onUpdateTemplate,
  onDeleteTemplate,
  onCreateCheckpoint,
  onUpdateCheckpoint,
  onDeleteCheckpoint,
  onCancel,
  loading,
}: TemplateEditorProps) {
  const [editingTemplate, setEditingTemplate] = useState<Template>(template)

  const handleSave = () => {
    onUpdateTemplate(editingTemplate)
  }

  return (
    <div className="space-y-6">
      {/* Template Edit Form */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Edit Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Template Name"
            value={editingTemplate.name}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
          />
          <Input
            type="number"
            step="0.1"
            placeholder="Swim Distance (km)"
            value={editingTemplate.swim_distance}
            onChange={(e) =>
              setEditingTemplate({
                ...editingTemplate,
                swim_distance: Number.parseFloat(e.target.value),
              })
            }
          />
          <Input
            type="number"
            step="0.1"
            placeholder="Bike Distance (km)"
            value={editingTemplate.bike_distance}
            onChange={(e) =>
              setEditingTemplate({
                ...editingTemplate,
                bike_distance: Number.parseFloat(e.target.value),
              })
            }
          />
          <Input
            type="number"
            step="0.1"
            placeholder="Run Distance (km)"
            value={editingTemplate.run_distance}
            onChange={(e) =>
              setEditingTemplate({
                ...editingTemplate,
                run_distance: Number.parseFloat(e.target.value),
              })
            }
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDeleteTemplate(template.id)} disabled={loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Template
          </Button>
        </div>
      </div>

      {/* Checkpoints Section */}
      <div className="space-y-4">
        <h4 className="font-semibold">Checkpoints</h4>

        {/* Existing Checkpoints */}
        <div className="space-y-2">
          {checkpoints.map((checkpoint) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              templateId={template.id}
              onUpdate={onUpdateCheckpoint}
              onDelete={onDeleteCheckpoint}
              loading={loading}
            />
          ))}
          {checkpoints.length === 0 && (
            <p className="text-gray-500 text-center py-4">No checkpoints defined for this template</p>
          )}
        </div>

        {/* Add New Checkpoint Form */}
        <CheckpointForm
          templateId={template.id}
          checkpoints={checkpoints}
          onSubmit={(data) => onCreateCheckpoint(template.id, data)}
          loading={loading}
        />
      </div>
    </div>
  )
}
