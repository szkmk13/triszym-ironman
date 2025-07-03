"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Template, type TemplateCheckpoint, type RouteData } from "@/lib/supabase"
import { toast } from "sonner"
import { ArrowLeft, Save, Plus } from "lucide-react"
import { BasicInfoTab } from "@/components/admin/tabs/basic-info-tab"
import { RouteMapsTab } from "@/components/admin/tabs/route-maps-tab"
import { CheckpointsTab } from "@/components/admin/tabs/checkpoints-tab"
import { SimulationTab } from "@/components/admin/tabs/simulation-tab"
import Link from "next/link"

interface RoutePoint {
  x: number
  y: number
}

interface Swimmer {
  id: string
  name: string
  pace: number // minuty na 100m dla swim, km/h dla bike/run
  startTime: Date
  color: string
}

const SEGMENT_COLORS = {
  swim: "#3b82f6", // niebieski
  bike: "#10b981", // zielony
  run: "#ef4444", // czerwony
}

const CHECKPOINT_COLORS = {
  swim_start: "#10b981", // zielony
  swim_finish: "#ef4444", // czerwony
  bike_checkpoints: "#f59e0b", // pomarańczowy
  run_checkpoints: "#8b5cf6", // fioletowy
}

type SegmentType = "swim" | "bike" | "run"

export default function TemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = Number(params.id)

  const [template, setTemplate] = useState<Template | null>(null)
  const [checkpoints, setCheckpoints] = useState<TemplateCheckpoint[]>([])
  const [loading, setLoading] = useState(true)

  // Map and route state for current segment
  const [currentSegment, setCurrentSegment] = useState<SegmentType>("swim")
  const [mapImages, setMapImages] = useState<{ [key in SegmentType]?: HTMLImageElement }>({})
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentRoute, setCurrentRoute] = useState<RoutePoint[]>([])
  const [imageFiles, setImageFiles] = useState<{ [key in SegmentType]?: File }>({})

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationTime, setSimulationTime] = useState(0)

  // Example swimmers for swim segment
  const [swimmers] = useState<Swimmer[]>([
    { id: "1", name: "Jan Kowalski", pace: 2.0, startTime: new Date(), color: "#ef4444" },
    { id: "2", name: "Anna Nowak", pace: 1.8, startTime: new Date(), color: "#3b82f6" },
    { id: "3", name: "Piotr Wiśniewski", pace: 2.2, startTime: new Date(), color: "#10b981" },
  ])

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchTemplate()
  }, [templateId])

  useEffect(() => {
    if (template) {
      // Load existing images for each segment
      const segments: SegmentType[] = ["swim", "bike", "run"]
      segments.forEach((segment) => {
        const imageUrl = template[`${segment}_map_url` as keyof Template] as string
        if (imageUrl) {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            setMapImages((prev) => ({ ...prev, [segment]: img }))
          }
          img.src = imageUrl
        }
      })
    }
  }, [template])

  // Calculate checkpoint position on route based on distance
  const calculateCheckpointPosition = (checkpoint: TemplateCheckpoint, routeData: RouteData): RoutePoint => {
    if (!routeData || routeData.points.length < 2 || !template) {
      return routeData?.points[0] || { x: 50, y: 50 }
    }

    // Special handling for start/finish checkpoints
    if (checkpoint.checkpoint_type === "swim_start" || checkpoint.distance_km === 0) {
      return routeData.points[0] // First point
    }

    if (checkpoint.checkpoint_type === "swim_finish" && !checkpoint.distance_km) {
      return routeData.points[routeData.points.length - 1] // Last point
    }

    // Calculate progress based on distance (0-1)
    const totalDistance = template[`${currentSegment}_distance` as keyof Template] as number
    const progress = Math.min(1, checkpoint.distance_km / totalDistance)
    console.log(totalDistance,progress)

    // Find position on route
    const totalPoints = routeData.points.length
    const targetIndex = Math.floor(progress * (totalPoints - 1))
    const nextIndex = Math.min(targetIndex + 1, totalPoints - 1)

    if (targetIndex === nextIndex) {
      return routeData.points[targetIndex]
    }

    // Interpolate between points
    const t = progress * (totalPoints - 1) - targetIndex
    const current = routeData.points[targetIndex]
    const next = routeData.points[nextIndex]

    return {
      x: current.x + (next.x - current.x) * t,
      y: current.y + (next.y - current.y) * t,
    }
  }

  const getCheckpointColor = (checkpoint: TemplateCheckpoint): string => {
    // Map checkpoint names to colors
    if (checkpoint.checkpoint_type === "swim_start")  return CHECKPOINT_COLORS.swim_start
    if (checkpoint.checkpoint_type === "swim_finish") return CHECKPOINT_COLORS.swim_finish
    if (checkpoint.checkpoint_type.startsWith("bike"))
      return CHECKPOINT_COLORS.bike_checkpoints
    if (checkpoint.checkpoint_type.startsWith("run"))
      return CHECKPOINT_COLORS.run_checkpoints

    // Default color based on segment
    return SEGMENT_COLORS[checkpoint.checkpoint_type as SegmentType]
  }

  const getCheckpointIcon = (checkpoint: TemplateCheckpoint) => {
    if (checkpoint.checkpoint_type === "swim_start") return "start"
    if (checkpoint.checkpoint_type === "swim_finish") return "finish"
    return "checkpoint"
  }

  // Canvas drawing effect
  useEffect(() => {
    if (canvasRef.current && mapImages[currentSegment]) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const mapImage = mapImages[currentSegment]
      if (!ctx || !mapImage) return

      const maxWidth = 800
      const maxHeight = 600
      const scale = Math.min(maxWidth / mapImage.width, maxHeight / mapImage.height, 1)

      canvas.width = mapImage.width * scale
      canvas.height = mapImage.height * scale

      // Draw background image
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height)

      // Draw saved route for current segment
      const routeData = template?.[`${currentSegment}_route_data` as keyof Template] as RouteData
      if (routeData && routeData.points.length > 1) {
        ctx.strokeStyle = routeData.color
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(routeData.points[0].x * scale, routeData.points[0].y * scale)
        routeData.points.forEach((point) => {
          ctx.lineTo(point.x * scale, point.y * scale)
        })
        ctx.stroke()

        // Draw checkpoints for current segment
        const segmentCheckpoints = checkpoints.filter((cp) => cp.checkpoint_type.startsWith(currentSegment))
        console.log(segmentCheckpoints)
        segmentCheckpoints.forEach((checkpoint) => {
          const position = calculateCheckpointPosition(checkpoint, routeData)
          const checkpointColor = getCheckpointColor(checkpoint)
          const iconType = getCheckpointIcon(checkpoint)

          // Draw checkpoint circle
          ctx.fillStyle = "#ffffff"
          ctx.strokeStyle = checkpointColor
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(position.x * scale, position.y * scale, 14, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()

          // Draw checkpoint icon based on type
          ctx.fillStyle = checkpointColor
          if (iconType === "start") {
            // Draw play icon for start
            ctx.beginPath()
            ctx.moveTo((position.x - 5) * scale, (position.y - 7) * scale)
            ctx.lineTo((position.x + 7) * scale, position.y * scale)
            ctx.lineTo((position.x - 5) * scale, (position.y + 7) * scale)
            ctx.closePath()
            ctx.fill()
          } else if (iconType === "finish") {
            // Draw stop icon for finish
            ctx.fillRect((position.x - 5) * scale, (position.y - 5) * scale, 10 * scale, 10 * scale)
          } else {
            // Draw flag for checkpoints
            ctx.beginPath()
            ctx.moveTo((position.x - 7) * scale, (position.y - 9) * scale)
            ctx.lineTo((position.x + 7) * scale, (position.y - 9) * scale)
            ctx.lineTo((position.x + 7) * scale, (position.y - 2) * scale)
            ctx.lineTo((position.x - 7) * scale, (position.y - 2) * scale)
            ctx.closePath()
            ctx.fill()

            // Draw flag pole
            ctx.strokeStyle = "#333333"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo((position.x - 7) * scale, (position.y - 9) * scale)
            ctx.lineTo((position.x - 7) * scale, (position.y + 9) * scale)
            ctx.stroke()
          }

          // Draw checkpoint label
          const labelText = checkpoint.name
          const distanceText = checkpoint.distance_km !== null ? `${checkpoint.distance_km}km` : ""

          ctx.fillStyle = "#ffffff"
          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 3
          ctx.font = "bold 12px Arial"
          ctx.textAlign = "center"

          // Draw name
          ctx.strokeText(labelText, position.x * scale, (position.y - 22) * scale)
          ctx.fillText(labelText, position.x * scale, (position.y - 22) * scale)

          // Draw distance
          if (distanceText) {
            ctx.font = "10px Arial"
            ctx.strokeText(distanceText, position.x * scale, (position.y - 34) * scale)
            ctx.fillText(distanceText, position.x * scale, (position.y - 34) * scale)
          }
        })
      }

      // Draw current route being drawn
      if (currentRoute.length > 1) {
        ctx.strokeStyle = SEGMENT_COLORS[currentSegment]
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(currentRoute[0].x * scale, currentRoute[0].y * scale)
        currentRoute.forEach((point) => {
          ctx.lineTo(point.x * scale, point.y * scale)
        })
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw swimmers for swim segment simulation
      if (isSimulating && currentSegment === "swim" && routeData) {
        swimmers.forEach((swimmer, index) => {
          const position = calculateSwimmerPosition(swimmer, routeData)

          // Draw swimmer dot
          ctx.fillStyle = swimmer.color
          ctx.strokeStyle = "#ffffff"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(position.x * scale, position.y * scale, 10, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()

          // Draw swimmer number
          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 12px Arial"
          ctx.textAlign = "center"
          ctx.fillText((index + 1).toString(), position.x * scale, position.y * scale + 4)
        })
      }
    }
  }, [mapImages, currentSegment, currentRoute, template, checkpoints, isSimulating, simulationTime])

  const fetchTemplate = async () => {
    setLoading(true)
    try {
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single()

      if (templateError) throw templateError

      setTemplate(templateData)

      const { data: checkpointData, error: checkpointError } = await supabase
        .from("template_checkpoints")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index")

      if (checkpointError) throw checkpointError

      setCheckpoints(checkpointData || [])
    } catch (error) {
      console.error("Error fetching template:", error)
      toast.error("Failed to fetch template")
      router.push("/admin")
    } finally {
      setLoading(false)
    }
  }

  const createDefaultCheckpoints = async () => {
    if (!template) return

    setLoading(true)
    try {
      const defaultCheckpoints = [
        {
          template_id: templateId,
          checkpoint_type: "swim",
          name: "Swim Start",
          distance_km: 0,
          order_index: 0,
        },
        {
          template_id: templateId,
          checkpoint_type: "swim",
          name: "Swim Finish",
          distance_km: template.swim_distance,
          order_index: 1,
        },
        {
          template_id: templateId,
          checkpoint_type: "bike",
          name: "Bike Checkpoints",
          distance_km: template.bike_distance / 2, // Middle of bike route
          order_index: 0,
        },
        {
          template_id: templateId,
          checkpoint_type: "run",
          name: "Run Checkpoints",
          distance_km: template.run_distance / 2, // Middle of run route
          order_index: 0,
        },
      ]

      const { error } = await supabase.from("template_checkpoints").insert(defaultCheckpoints)

      if (error) throw error

      toast.success("Default checkpoints created")
      await fetchTemplate()
    } catch (error) {
      console.error("Error creating default checkpoints:", error)
      toast.error("Failed to create default checkpoints")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImageFiles((prev) => ({ ...prev, [currentSegment]: file }))
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setMapImages((prev) => ({ ...prev, [currentSegment]: img }))
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const mapImage = mapImages[currentSegment]
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
    if (!isDrawing) return
    const mapImage = mapImages[currentSegment]
    if (!mapImage) return

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

    const routeData: RouteData = {
      points: [...currentRoute],
      color: SEGMENT_COLORS[currentSegment],
    }

    setTemplate((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [`${currentSegment}_route_data`]: routeData,
      }
    })

    setCurrentRoute([])
    toast.success(`Route saved for ${currentSegment}`)
  }

  const clearCurrentRoute = () => {
    setTemplate((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [`${currentSegment}_route_data`]: null,
      }
    })
    setCurrentRoute([])
    toast.success(`Route cleared for ${currentSegment}`)
  }

  const calculateSwimmerPosition = (swimmer: Swimmer, routeData: RouteData): RoutePoint => {
    if (!routeData || routeData.points.length < 2) {
      return { x: 50, y: 50 }
    }

    if (!template) return { x: 50, y: 50 }

    // Calculate distance swum based on pace and time
    const timeInMinutes = simulationTime / 60
    const distanceSwum = (timeInMinutes / swimmer.pace) * 100 // meters
    const swimDistance = template.swim_distance * 1000 // convert km to meters

    // Calculate progress (0-1)
    const progress = Math.min(1, distanceSwum / swimDistance)

    // Find position on route
    const totalPoints = routeData.points.length
    const targetIndex = Math.floor(progress * (totalPoints - 1))
    const nextIndex = Math.min(targetIndex + 1, totalPoints - 1)

    if (targetIndex === nextIndex) {
      return routeData.points[targetIndex]
    }

    // Interpolate between points
    const t = progress * (totalPoints - 1) - targetIndex
    const current = routeData.points[targetIndex]
    const next = routeData.points[nextIndex]

    return {
      x: current.x + (next.x - current.x) * t,
      y: current.y + (next.y - current.y) * t,
    }
  }

  const uploadMapImage = async (file: File, segment: SegmentType): Promise<string> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `template-${templateId}-${segment}-${Date.now()}.${fileExt}`
    const filePath = `maps/${fileName}`

    const { data, error } = await supabase.storage.from("triathlon-maps").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabase.storage.from("triathlon-maps").getPublicUrl(filePath)

    return publicUrl
  }

  const saveTemplate = async () => {
    if (!template) return

    setLoading(true)
    try {
      const updateData: any = {
        name: template.name,
        swim_distance: template.swim_distance,
        bike_distance: template.bike_distance,
        run_distance: template.run_distance,
      }

      // Upload new images and update URLs
      const segments: SegmentType[] = ["swim", "bike", "run"]
      for (const segment of segments) {
        const file = imageFiles[segment]
        if (file) {
          const imageUrl = await uploadMapImage(file, segment)
          updateData[`${segment}_map_url`] = imageUrl
        } else {
          updateData[`${segment}_map_url`] = template[`${segment}_map_url` as keyof Template]
        }

        // Save route data
        updateData[`${segment}_route_data`] = template[`${segment}_route_data` as keyof Template]
      }

      const { error } = await supabase.from("templates").update(updateData).eq("id", templateId)

      if (error) throw error

      toast.success("Template saved successfully")
      await fetchTemplate()
      setImageFiles({}) // Clear uploaded files
    } catch (error) {
      console.error("Error saving template:", error)
      toast.error("Failed to save template")
    } finally {
      setLoading(false)
    }
  }



  const startSimulation = () => {
    setIsSimulating(true)
    setSimulationTime(0)
  }

  const pauseSimulation = () => {
    setIsSimulating(false)
  }

  const resetSimulation = () => {
    setIsSimulating(false)
    setSimulationTime(0)
  }

  // Simulation timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSimulating) {
      interval = setInterval(() => {
        setSimulationTime((prev) => prev + 10) // +10 seconds per second (10x speed)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSimulating])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading template...</div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Template not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Template: {template.name}</h1>
        </div>
        <div className="flex gap-2">
          {checkpoints.length === 0 && (
            <Button onClick={createDefaultCheckpoints} disabled={loading} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Default Checkpoints
            </Button>
          )}
          <Button onClick={saveTemplate} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="route">Route Maps</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
          <TabsTrigger value="simulation">Live Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicInfoTab template={template} onUpdateTemplate={setTemplate} />
        </TabsContent>

        <TabsContent value="route">
          <RouteMapsTab
            template={template}
            checkpoints={checkpoints}
            currentSegment={currentSegment}
            onSegmentChange={setCurrentSegment}
            mapImages={mapImages}
            currentRoute={currentRoute}
            canvasRef={canvasRef}
            onImageUpload={handleImageUpload}
            onCanvasMouseDown={handleCanvasMouseDown}
            onCanvasMouseMove={handleCanvasMouseMove}
            onCanvasMouseUp={handleCanvasMouseUp}
            onSaveCurrentRoute={saveCurrentRoute}
            onClearCurrentRoute={clearCurrentRoute}
            getCheckpointColor={getCheckpointColor}
          />
        </TabsContent>

        <TabsContent value="checkpoints">
          <CheckpointsTab
            templateId={templateId}
            checkpoints={checkpoints}
          />
        </TabsContent>

        <TabsContent value="simulation">
          <SimulationTab
            template={template}
            swimmers={swimmers}
            isSimulating={isSimulating}
            simulationTime={simulationTime}
            canvasRef={canvasRef}
            onStartSimulation={startSimulation}
            onPauseSimulation={pauseSimulation}
            onResetSimulation={resetSimulation}
            formatTime={formatTime}
            hasSwimRoute={!!(mapImages.swim && template.swim_route_data)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
