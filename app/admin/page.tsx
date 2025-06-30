"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      toast.success("Access granted")
    } else {
      toast.error("Invalid password")
    }
  }

  const fetchTemplates = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("templates").select("*").order("name")

    if (error) {
      toast.error("Failed to fetch templates")
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
      const { data, error } = await supabase
        .from("templates")
        .insert(newTemplate)
        .select()

      if (error) throw error

      toast.success("Template created successfully")

      setNewTemplate({
        name: "",
        swim_distance: 1.5,
        bike_distance: 40,
        run_distance: 10,
      })

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
      const { data, error } = await supabase
        .from("templates")
        .delete()
        .eq("id", templateId)
        .select()

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
      const { data, error } = await supabase.from("template_checkpoints").insert({
        template_id: templateId,
        checkpoint_type: checkpointData.checkpoint_type,
        name: checkpointData.name,
        distance_km: checkpointData.distance_km || null,
        order_index: checkpointData.order_index,
      }).select()

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

      setEditingCheckpoint(null)
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
      const { data, error } = await supabase
        .from("template_checkpoints")
        .delete()
        .eq("id", checkpointId)
        .select()

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
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Helper function to get available checkpoint types
  const getAvailableCheckpointTypes = (templateId: number, excludeCheckpointId?: number) => {
    const allTypes = [
      { value: "swim_start", label: "Swim Start" },
      { value: "swim_finish", label: "Swim Finish" },
      { value: "t1_finish", label: "T1 Finish" },
      { value: "bike_checkpoint", label: "Bike Checkpoint" },
      { value: "t2_finish", label: "T2 Finish" },
      { value: "run_checkpoint", label: "Run Checkpoint" },
      { value: "finish", label: "Finish" }
    ];

    // Get existing checkpoint types for this template
    const existingTypes = (checkpoints[templateId] || [])
      .filter(cp => cp.id !== excludeCheckpointId) // Exclude current checkpoint when editing
      .map(cp => cp.checkpoint_type);

    // Types that should be unique (only one allowed per template)
    const uniqueTypes = ["swim_start", "swim_finish", "t1_finish", "t2_finish", "finish"];

    // Filter out types that already exist and should be unique
    return allTypes.filter(type => {
      if (uniqueTypes.includes(type.value)) {
        return !existingTypes.includes(type.value);
      }
      return true; // Allow multiple bike_checkpoint and run_checkpoint
    });
  };

  const CheckpointForm = ({ templateId, onSubmit, onCancel }: { templateId: number, onSubmit: (data: any) => void, onCancel?: () => void }) => {
    const availableTypes = getAvailableCheckpointTypes(templateId);
    const defaultType = availableTypes.length > 0 ? availableTypes[0].value : "bike_checkpoint";
    
    const [formData, setFormData] = useState({
      checkpoint_type: defaultType,
      name: availableTypes.length > 0 ? availableTypes[0].label : "Bike Checkpoint",
      distance_km: 0,
      order_index: (checkpoints[templateId]?.length || 0) + 1,
    });

    // Update form data when available types change
    useEffect(() => {
      const newAvailableTypes = getAvailableCheckpointTypes(templateId);
      if (newAvailableTypes.length > 0 && !newAvailableTypes.some(type => type.value === formData.checkpoint_type)) {
        const newDefaultType = newAvailableTypes[0];
        setFormData(prev => ({
          ...prev,
          checkpoint_type: newDefaultType.value,
          name: newDefaultType.label
        }));
      }
    }, [checkpoints[templateId]]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(formData)
      
      // Reset form with next available type
      const newAvailableTypes = getAvailableCheckpointTypes(templateId);
      const newDefaultType = newAvailableTypes.length > 0 ? newAvailableTypes[0].value : "bike_checkpoint";
      
      setFormData({
        checkpoint_type: newDefaultType,
        name: newAvailableTypes.length > 0 ? newAvailableTypes[0].label : "Bike Checkpoint",
        distance_km: 0,
        order_index: (checkpoints[templateId]?.length || 0) + 2,
      })
    }

    const handleCheckpointTypeChange = (newType: string) => {
      const selectedType = availableTypes.find(type => type.value === newType);
      setFormData({
        ...formData,
        checkpoint_type: newType,
        name: selectedType ? selectedType.label : formatCheckpointTypeName(newType)
      })
    }

    // Don't show form if no types are available
    if (availableTypes.length === 0) {
      return (
        <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-500">
          All checkpoint types have been added to this template.
        </div>
      );
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
              {availableTypes.map(type => (
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
          <div className="space-y-6">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 space-y-4">
                {editingTemplate?.id === template.id ? (
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
                        <Button size="sm" onClick={() => updateTemplate(editingTemplate)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Template
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteTemplate(template.id)}>
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
                                    {getAvailableCheckpointTypes(template.id, editingCheckpoint.id).map(type => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                    {/* Always include the current type even if it would normally be filtered out */}
                                    {!getAvailableCheckpointTypes(template.id, editingCheckpoint.id)
                                      .some(type => type.value === editingCheckpoint.checkpoint_type) && (
                                      <option value={editingCheckpoint.checkpoint_type}>
                                        {formatCheckpointTypeName(editingCheckpoint.checkpoint_type)}
                                      </option>
                                    )}
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

                      {/* Add New Checkpoint Form */}
                      <CheckpointForm
                        templateId={template.id}
                        onSubmit={(data) => createCheckpoint(template.id, data)}
                      />
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
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
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
    </div>
  )
}