"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, X, Trash2, Palette, RotateCcw } from "lucide-react"
import { CheckpointForm } from "./checkpoint-form"
import { CheckpointItem } from "./checkpoint-item"
import type { Template, TemplateCheckpoint } from "@/lib/supabase"

interface RoutePoint {
  x: number
  y: number
}

interface RouteSegment {
  type: "swim" | "t1" | "bike" | "t2" | "run"
  points: RoutePoint[]
  color: string
}

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

const SEGMENT_COLORS = {
  swim: "#3b82f6", // niebieski
  t1: "#f59e0b", // pomarańczowy
  bike: "#10b981", // zielony
  t2: "#f59e0b", // pomarańczowy
  run: "#ef4444", // czerwony
}

const SEGMENT_NAMES = {
  swim: "Pływanie",
  t1: "T1",
  bike: "Rower",
  t2: "T2",
  run: "Bieg",
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
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentSegment, setCurrentSegment] = useState<"swim" | "t1" | "bike" | "t2" | "run">("swim")
  const [routes, setRoutes] = useState<RouteSegment[]>(template.route_data || [])
  const [currentRoute, setCurrentRoute] = useState<RoutePoint[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Załaduj istniejący obraz jeśli istnieje
  useEffect(() => {
    if (template.map_image_url) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        setMapImage(img)
      }
      img.src = template.map_image_url
    }
  }, [template.map_image_url])

  // Rysowanie na canvas
  useEffect(() => {
    if (canvasRef.current && mapImage) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Ustaw rozmiar canvas
      const maxWidth = 800
      const maxHeight = 600
      const scale = Math.min(maxWidth / mapImage.width, maxHeight / mapImage.height, 1)

      canvas.width = mapImage.width * scale
      canvas.height = mapImage.height * scale

      // Narysuj obraz tła
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height)

      // Narysuj zapisane trasy
      routes.forEach((route) => {
        if (route.points.length > 1) {
          ctx.strokeStyle = route.color
          ctx.lineWidth = 4
          ctx.lineCap = "round"
          ctx.beginPath()
          ctx.moveTo(route.points[0].x * scale, route.points[0].y * scale)
          route.points.forEach((point) => {
            ctx.lineTo(point.x * scale, point.y * scale)
          })
          ctx.stroke()
        }
      })

      // Narysuj aktualnie rysowaną trasę
      if (currentRoute.length > 1) {
        ctx.strokeStyle = SEGMENT_COLORS[currentSegment]
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(currentRoute[0].x * scale, currentRoute[0].y * scale)
        currentRoute.forEach((point) => {
          ctx.lineTo(point.x * scale, point.y * scale)
        })
        ctx.stroke()
      }
    }
  }, [mapImage, routes, currentRoute, currentSegment])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setMapImage(img)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mapImage) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = mapImage.width / canvas.width
    const scaleY = mapImage.height / canvas.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    setIsDrawing(true)
    setCurrentRoute([{ x, y }])
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !mapImage) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = mapImage.width / canvas.width
    const scaleY = mapImage.height / canvas.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    setCurrentRoute((prev) => [...prev, { x, y }])
  }

  const handleCanvasMouseUp = () => {
    setIsDrawing(false)
  }

  const saveCurrentRoute = () => {
    if (currentRoute.length < 2) return

    const newRoute: RouteSegment = {
      type: currentSegment,
      points: [...currentRoute],
      color: SEGMENT_COLORS[currentSegment],
    }

    setRoutes((prev) => [...prev, newRoute])
    setCurrentRoute([])
  }

  const clearRoutes = () => {
    setRoutes([])
    setCurrentRoute([])
  }

  const handleSave = async () => {
    let imageUrl = editingTemplate.map_image_url

    // Upload nowego obrazu jeśli został wybrany
    if (imageFile) {
      imageUrl = await uploadMapImage(imageFile, template.id)
    }

    // Zapisz template z danymi tras
    const updatedTemplate = {
      ...editingTemplate,
      map_image_url: imageUrl,
      route_data: routes,
    }

    onUpdateTemplate(updatedTemplate)
  }

  // Funkcja do uploadu obrazu do Supabase Storage
  const uploadMapImage = async (file: File, templateId: number): Promise<string> => {
    // Ta funkcja będzie implementowana w następnym kroku
    // Zwróci URL do uploadowanego obrazu
    return ""
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
      </div>

      {/* Map Route Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa Trasy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="map-upload">Wgraj mapę trasy</Label>
            <Input id="map-upload" type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} />
          </div>

          {mapImage && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <Label>Aktualny segment</Label>
                  <Select value={currentSegment} onValueChange={(value: any) => setCurrentSegment(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="swim">Pływanie</SelectItem>
                      <SelectItem value="t1">T1</SelectItem>
                      <SelectItem value="bike">Rower</SelectItem>
                      <SelectItem value="t2">T2</SelectItem>
                      <SelectItem value="run">Bieg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={saveCurrentRoute} disabled={currentRoute.length < 2}>
                    <Palette className="w-4 h-4 mr-2" />
                    Zapisz trasę
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearRoutes}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Wyczyść wszystko
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="cursor-crosshair max-w-full h-auto"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {routes.map((route, index) => (
                  <Badge key={index} style={{ backgroundColor: route.color, color: "white" }}>
                    {SEGMENT_NAMES[route.type]}
                  </Badge>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Kliknij i przeciągnij myszką, aby narysować trasę dla wybranego segmentu.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button variant="destructive" onClick={() => onDeleteTemplate(template.id)} disabled={loading}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Template
        </Button>
      </div>

      {/* Checkpoints Section */}
      <div className="space-y-4">
        <h4 className="font-semibold">Checkpoints</h4>

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
