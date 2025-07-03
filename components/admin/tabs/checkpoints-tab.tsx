"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckpointForm } from "@/components/admin/checkpoint-form"
import { CheckpointItem } from "@/components/admin/checkpoint-item"
import type { TemplateCheckpoint } from "@/lib/supabase"

import type React from "react"

import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useState } from "react"

interface CheckpointsTabProps {
  templateId: number
  checkpoints: TemplateCheckpoint[]
  // onCreateDefaultCheckpoints: () => void
  // onCreateCheckpoint: (checkpointData: any) => void
  // onUpdateCheckpoint: (checkpoint: TemplateCheckpoint) => void
  // onDeleteCheckpoint: (checkpointId: number) => void
  // loading: boolean
}

export function CheckpointsTab({
  templateId,
  checkpoints,
}: CheckpointsTabProps) {
  const [loading, setLoading] = useState(false)
  
    const createCheckpoint = async (checkpointData: any) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("template_checkpoints")
        .insert({
          template_id: templateId,
          checkpoint_type: checkpointData.checkpoint_type,
          name: checkpointData.name,
          distance_km: checkpointData.distance_km || null,
          order_index: checkpointData.order_index,
        })
        .select()

      if (error) throw error

      toast.success("Checkpoint created successfully")
      await fetchTemplate()
    } catch (error) {
      console.error("Error creating checkpoint:", error)
      toast.error("Failed to create checkpoint")
    } finally {
      setLoading(false)
    }
  }

  const updateCheckpoint = async (checkpoint: TemplateCheckpoint) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("template_checkpoints")
        .update({
          checkpoint_type: checkpoint.checkpoint_type,
          name: checkpoint.name,
          distance_km: checkpoint.distance_km || null,
          order_index: checkpoint.order_index,
        })
        .eq("id", checkpoint.id)
        .select()

      if (error) throw error

      toast.success("Checkpoint updated successfully")
      await fetchTemplate()
    } catch (error) {
      console.error("Error updating checkpoint:", error)
      toast.error("Failed to update checkpoint")
    } finally {
      setLoading(false)
    }
  }

  const deleteCheckpoint = async (checkpointId: number) => {
    if (!confirm("Are you sure you want to delete this checkpoint?")) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.from("template_checkpoints").delete().eq("id", checkpointId).select()

      if (error) throw error

      toast.success("Checkpoint deleted successfully")
      await fetchTemplate()
    } catch (error) {
      console.error("Error deleting checkpoint:", error)
      toast.error("Failed to delete checkpoint")
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Checkpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {checkpoints.map((checkpoint) => (
              <CheckpointItem
                key={checkpoint.id}
                checkpoint={checkpoint}
                templateId={templateId}
                onUpdate={updateCheckpoint}
                onDelete={deleteCheckpoint}
                loading={loading}
              />
            ))}
            {checkpoints.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No checkpoints defined for this template</p>
              </div>
            )}
          </div>

          <CheckpointForm
            templateId={templateId}
            checkpoints={checkpoints}
            onSubmit={createCheckpoint}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
