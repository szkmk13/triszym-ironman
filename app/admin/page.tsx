"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase, type Template, type TemplateCheckpoint } from "@/lib/supabase"
import { toast } from "sonner"
import { Settings, Edit, Trash2, MapPin, CheckCircle } from "lucide-react"
import { LoginForm } from "@/components/admin/login-form"
import { TemplateForm } from "@/components/admin/template-form"
import Link from "next/link"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [checkpoints, setCheckpoints] = useState<{ [key: number]: TemplateCheckpoint[] }>({})
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
      await fetchTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    } finally {
      setLoading(false)
    }
  }

  const getSegmentStatus = (template: Template) => {
    const segments = [
      { name: "Swim", hasMap: !!template.swim_map_url, hasRoute: !!template.swim_route_data },
      { name: "Bike", hasMap: !!template.bike_map_url, hasRoute: !!template.bike_route_data },
      { name: "Run", hasMap: !!template.run_map_url, hasRoute: !!template.run_route_data },
    ]

    const configured = segments.filter((s) => s.hasMap && s.hasRoute).length
    return { segments, configured, total: segments.length }
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
          <div className="space-y-4">
            {templates.map((template) => {
              const segmentStatus = getSegmentStatus(template)
              return (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Swim: {template.swim_distance}km</span>
                        <span>Bike: {template.bike_distance}km</span>
                        <span>Run: {template.run_distance}km</span>
                        <span>Checkpoints: {checkpoints[template.id]?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>
                            Routes: {segmentStatus.configured}/{segmentStatus.total} configured
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {segmentStatus.segments.map((segment, index) => (
                            <div
                              key={index}
                              className={`text-xs px-2 py-1 rounded ${
                                segment.hasMap && segment.hasRoute
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {segment.name}
                              {segment.hasMap && segment.hasRoute && <CheckCircle className="inline h-3 w-3 ml-1" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/template/${template.id}`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit & Map
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteTemplate(template.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            {templates.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No templates found. Create your first template above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
