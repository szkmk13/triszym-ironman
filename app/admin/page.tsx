"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase, type Template, type TemplateCheckpoint } from "@/lib/supabase"
import { toast } from "sonner"
import { Settings } from "lucide-react"
import { LoginForm } from "@/components/admin/login-form"
import { TemplateForm } from "@/components/admin/template-form"
import { TemplateCard } from "@/components/admin/template-card"
import { TemplateEditor } from "@/components/admin/template-editor"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [checkpoints, setCheckpoints] = useState<{ [key: number]: TemplateCheckpoint[] }>({})
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplates()
    }
  }, [isAuthenticated])

  const fetchTemplates = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("templates").select("*").order("name")

    if (error) {
      toast.error("Failed to fetch templates")
    } else {
      setTemplates(data || [])
      for (const template of data || []) {
        await fetchCheckpoints(template.id)
      }
    }
    setLoading(false)
  }

  const fetchCheckpoints = async (templateId: number) => {
    const { data, error } = await supabase
      .from("template_checkpoints")
      .select("*")
      .eq("template_id", templateId)
      .order("order_index")

    if (error) {
      console.error("Error fetching checkpoints:", error)
    } else {
      setCheckpoints((prev) => ({ ...prev, [templateId]: data || [] }))
    }
  }

  const createTemplate = async (templateData: {
    name: string
    swim_distance: number
    bike_distance: number
    run_distance: number
  }) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("templates").insert(templateData).select()

      if (error) throw error

      toast.success("Template created successfully")
      await fetchTemplates()
    } catch (error) {
      console.error("Error creating template:", error)
      toast.error("Failed to create template")
    } finally {
      setLoading(false)
    }
  }

  const updateTemplate = async (template: Template) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("templates")
        .update({
          name: template.name,
          swim_distance: template.swim_distance,
          bike_distance: template.bike_distance,
          run_distance: template.run_distance,
        })
        .eq("id", template.id)
        .select()

      if (error) throw error

      toast.success("Template updated successfully")
      await fetchTemplates()
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    } finally {
      setLoading(false)
    }
  }

  const deleteTemplate = async (templateId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this template? This will also delete all associated checkpoints and athlete data.",
      )
    ) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.from("templates").delete().eq("id", templateId).select()

      if (error) throw error

      toast.success("Template deleted successfully")
      setEditingTemplate(null)
      await fetchTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    } finally {
      setLoading(false)
    }
  }

  const createCheckpoint = async (templateId: number, checkpointData: any) => {
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
      await fetchCheckpoints(templateId)
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
      await fetchCheckpoints(checkpoint.template_id)
    } catch (error) {
      console.error("Error updating checkpoint:", error)
      toast.error("Failed to update checkpoint")
    } finally {
      setLoading(false)
    }
  }

  const deleteCheckpoint = async (checkpointId: number, templateId: number) => {
    if (!confirm("Are you sure you want to delete this checkpoint?")) {
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.from("template_checkpoints").delete().eq("id", checkpointId).select()

      if (error) throw error

      toast.success("Checkpoint deleted successfully")
      await fetchCheckpoints(templateId)
    } catch (error) {
      console.error("Error deleting checkpoint:", error)
      toast.error("Failed to delete checkpoint")
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Template Administration
        </h1>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
          Logout
        </Button>
      </div>

      <TemplateForm onSubmit={createTemplate} loading={loading} />

      <Card>
        <CardHeader>
          <CardTitle>Existing Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 space-y-4">
                {editingTemplate?.id === template.id ? (
                  <TemplateEditor
                    template={template}
                    checkpoints={checkpoints[template.id] || []}
                    onUpdateTemplate={updateTemplate}
                    onDeleteTemplate={deleteTemplate}
                    onCreateCheckpoint={createCheckpoint}
                    onUpdateCheckpoint={updateCheckpoint}
                    onDeleteCheckpoint={deleteCheckpoint}
                    onCancel={() => setEditingTemplate(null)}
                    loading={loading}
                  />
                ) : (
                  <TemplateCard
                    template={template}
                    checkpointCount={checkpoints[template.id]?.length || 0}
                    onEdit={setEditingTemplate}
                    onDelete={deleteTemplate}
                    loading={loading}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
