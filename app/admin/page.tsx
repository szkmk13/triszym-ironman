"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { supabase, type Template, type TemplateCheckpoint } from "@/lib/supabase"
import { toast } from "sonner"
import { Lock, Plus, Edit, Trash2, Save, X, Settings } from "lucide-react"

export default function AdminPage() {
  const passwordCheck = process.env.NEXT_PUBLIC_ADMIN_PASSWORD
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [checkpoints, setCheckpoints] = useState<{ [key: number]: TemplateCheckpoint[] }>({})
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editingCheckpoint, setEditingCheckpoint] = useState<TemplateCheckpoint | null>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    swim_distance: 1.5,
    bike_distance: 40,
    run_distance: 10,
  })
  const [newCheckpoint, setNewCheckpoint] = useState({
    template_id: 0,
    checkpoint_type: "swim_start",
    name: "",
    distance_km: 0,
    order_index: 1,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplates()
    }
  }, [isAuthenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // In a real app, you'd verify this on the server side
    // For now, we'll check against the environment variable on the client
    if (password === passwordCheck) {
      setIsAuthenticated(true)
      toast({
        title: "Success",
        description: "Access granted",
      })
    } else {
      toast({
        title: "Error",
        description: "Invalid password",
        variant: "destructive",
      })
    }
  }

  const fetchTemplates = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("templates").select("*").order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      })
    } else {
      setTemplates(data || [])
      // Fetch checkpoints for each template
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

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("templates").insert(newTemplate)

      if (error) throw error

      toast({
        title: "Success",
        description: "Template created successfully",
      })

      setNewTemplate({
        name: "",
        swim_distance: 1.5,
        bike_distance: 40,
        run_distance: 10,
      })

      fetchTemplates()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateTemplate = async (template: Template) => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from("templates")
        .update({
          name: template.name,
          swim_distance: template.swim_distance,
          bike_distance: template.bike_distance,
          run_distance: template.run_distance,
        })
        .eq("id", template.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Template updated successfully",
      })

      setEditingTemplate(null)
      fetchTemplates()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      })
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
      const { error } = await supabase.from("templates").delete().eq("id", templateId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Template deleted successfully",
      })

      fetchTemplates()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("template_checkpoints").insert(newCheckpoint)

      if (error) throw error

      toast({
        title: "Success",
        description: "Checkpoint created successfully",
      })

      setNewCheckpoint({
        template_id: 0,
        checkpoint_type: "swim_start",
        name: "",
        distance_km: 0,
        order_index: 1,
      })

      fetchCheckpoints(newCheckpoint.template_id)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create checkpoint",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCheckpoint = async (checkpoint: TemplateCheckpoint) => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from("template_checkpoints")
        .update({
          checkpoint_type: checkpoint.checkpoint_type,
          name: checkpoint.name,
          distance_km: checkpoint.distance_km,
          order_index: checkpoint.order_index,
        })
        .eq("id", checkpoint.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Checkpoint updated successfully",
      })

      setEditingCheckpoint(null)
      fetchCheckpoints(checkpoint.template_id)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update checkpoint",
        variant: "destructive",
      })
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
      const { error } = await supabase.from("template_checkpoints").delete().eq("id", checkpointId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Checkpoint deleted successfully",
      })

      fetchCheckpoints(templateId)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete checkpoint",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-6 w-6" />
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
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

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Create New Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTemplate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="swimDistance">Swim Distance (km)</Label>
                    <Input
                      id="swimDistance"
                      type="number"
                      step="0.1"
                      value={newTemplate.swim_distance}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, swim_distance: Number.parseFloat(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bikeDistance">Bike Distance (km)</Label>
                    <Input
                      id="bikeDistance"
                      type="number"
                      step="0.1"
                      value={newTemplate.bike_distance}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, bike_distance: Number.parseFloat(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="runDistance">Run Distance (km)</Label>
                    <Input
                      id="runDistance"
                      type="number"
                      step="0.1"
                      value={newTemplate.run_distance}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, run_distance: Number.parseFloat(e.target.value) })
                      }
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    {editingTemplate?.id === template.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Input
                            value={editingTemplate.name}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                          />
                          <Input
                            type="number"
                            step="0.1"
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
                          <Button size="sm" onClick={() => updateTemplate(editingTemplate)}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                          <p className="text-sm text-gray-600">
                            Swim: {template.swim_distance}km • Bike: {template.bike_distance}km • Run:{" "}
                            {template.run_distance}km
                          </p>
                          <p className="text-xs text-gray-500">Checkpoints: {checkpoints[template.id]?.length || 0}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingTemplate(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteTemplate(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkpoints" className="space-y-6">
          {/* Create New Checkpoint */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Checkpoint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createCheckpoint} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="checkpointTemplate">Template</Label>
                    <select
                      id="checkpointTemplate"
                      className="w-full p-2 border rounded-md"
                      value={newCheckpoint.template_id}
                      onChange={(e) =>
                        setNewCheckpoint({ ...newCheckpoint, template_id: Number.parseInt(e.target.value) })
                      }
                      required
                    >
                      <option value={0}>Select Template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="checkpointType">Type</Label>
                    <select
                      id="checkpointType"
                      className="w-full p-2 border rounded-md"
                      value={newCheckpoint.checkpoint_type}
                      onChange={(e) => setNewCheckpoint({ ...newCheckpoint, checkpoint_type: e.target.value })}
                      required
                    >
                      <option value="swim_start">Swim Start</option>
                      <option value="swim_finish">Swim Finish</option>
                      <option value="t1_finish">T1 Finish</option>
                      <option value="bike_checkpoint">Bike Checkpoint</option>
                      <option value="t2_finish">T2 Finish</option>
                      <option value="run_checkpoint">Run Checkpoint</option>
                      <option value="finish">Finish</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="checkpointName">Name</Label>
                    <Input
                      id="checkpointName"
                      value={newCheckpoint.name}
                      onChange={(e) => setNewCheckpoint({ ...newCheckpoint, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkpointDistance">Distance (km)</Label>
                    <Input
                      id="checkpointDistance"
                      type="number"
                      step="0.1"
                      value={newCheckpoint.distance_km}
                      onChange={(e) =>
                        setNewCheckpoint({ ...newCheckpoint, distance_km: Number.parseFloat(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkpointOrder">Order</Label>
                    <Input
                      id="checkpointOrder"
                      type="number"
                      value={newCheckpoint.order_index}
                      onChange={(e) =>
                        setNewCheckpoint({ ...newCheckpoint, order_index: Number.parseInt(e.target.value) })
                      }
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading || newCheckpoint.template_id === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Checkpoint
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Checkpoints by Template */}
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle>{template.name} Checkpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checkpoints[template.id]?.map((checkpoint) => (
                    <div key={checkpoint.id} className="border rounded-lg p-3">
                      {editingCheckpoint?.id === checkpoint.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <select
                              className="w-full p-2 border rounded-md"
                              value={editingCheckpoint.checkpoint_type}
                              onChange={(e) =>
                                setEditingCheckpoint({ ...editingCheckpoint, checkpoint_type: e.target.value })
                              }
                            >
                              <option value="swim_start">Swim Start</option>
                              <option value="swim_finish">Swim Finish</option>
                              <option value="t1_finish">T1 Finish</option>
                              <option value="bike_checkpoint">Bike Checkpoint</option>
                              <option value="t2_finish">T2 Finish</option>
                              <option value="run_checkpoint">Run Checkpoint</option>
                              <option value="finish">Finish</option>
                            </select>
                            <Input
                              value={editingCheckpoint.name}
                              onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, name: e.target.value })}
                            />
                            <Input
                              type="number"
                              step="0.1"
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
                            <Button size="sm" onClick={() => updateCheckpoint(editingCheckpoint)}>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCheckpoint(null)}>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={getCheckpointTypeColor(checkpoint.checkpoint_type)}>
                              {checkpoint.checkpoint_type.replace("_", " ")}
                            </Badge>
                            <div>
                              <span className="font-medium">{checkpoint.name}</span>
                              {checkpoint.distance_km && (
                                <span className="text-sm text-gray-500 ml-2">({checkpoint.distance_km}km)</span>
                              )}
                              <span className="text-xs text-gray-400 ml-2">Order: {checkpoint.order_index}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingCheckpoint(checkpoint)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteCheckpoint(checkpoint.id, template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!checkpoints[template.id] || checkpoints[template.id].length === 0) && (
                    <p className="text-gray-500 text-center py-4">No checkpoints defined for this template</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
