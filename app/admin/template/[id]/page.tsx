"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { BasicInfoTab } from "@/components/admin/tabs/basic-info-tab";
import { RouteMapsTab } from "@/components/admin/tabs/route-maps-tab";
import { CheckpointsTab } from "@/components/admin/tabs/checkpoints-tab";
import Link from "next/link";
import {
  useCheckpoints,
  useTemplate,
  useUpdateTemplateRoute,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Template,
  RouteData,
  TemplateCheckpoint,
  RoutePoint,
  SegmentRoutData,
} from "@/lib/supabase-types";
import { supabase } from "@/lib/supabase-utils";

const SEGMENT_COLORS = {
  swim: "#3b82f6", // niebieski
  bike: "#10b981", // zielony
  run: "#ef4444", // czerwony
};

const CHECKPOINT_COLORS = {
  swim_start: "#10b981", // zielony
  swim_finish: "#ef4444", // czerwony
  bike_checkpoints: "#f59e0b", // pomarańczowy
  run_checkpoints: "#8b5cf6", // fioletowy
};

type SegmentType = "swim" | "bike" | "run";

export default function TemplateEditPage() {
  const params = useParams();
  // const router = useRouter();
  const templateId = Number(params.id);
  // const queryClient = useQueryClient();

  const { data: checkpoints = [] } = useCheckpoints(templateId || 0);
  const { data: template } = useTemplate(templateId || 0);
  // Local state for tracking changes
  const [localTemplate, setLocalTemplate] = useState<Template | null>(null);

  // Map and route state for current segment
  const [currentSegment, setCurrentSegment] = useState<SegmentType>("swim");
  const [mapImages, setMapImages] = useState<{
    [key in SegmentType]?: HTMLImageElement;
  }>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<RoutePoint[]>([]);
  const [imageFiles, setImageFiles] = useState<{ [key in SegmentType]?: File }>(
    {}
  );
  const costam = useUpdateTemplateRoute();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize local template when data is loaded
  useEffect(() => {
    if (template && !localTemplate) {
      setLocalTemplate(template);
    }
  }, [template, localTemplate]);

  useEffect(() => {
    if (localTemplate) {
      // Load existing images for each segment
      const segments: SegmentType[] = ["swim", "bike", "run"];
      segments.forEach((segment) => {
        const imageUrl = localTemplate[
          `${segment}_map_url` as keyof Template
        ] as string;
        if (imageUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            setMapImages((prev) => ({ ...prev, [segment]: img }));
          };
          img.src = imageUrl;
        }
      });
    }
  }, [localTemplate]);

  // Calculate checkpoint position on route based on distance and laps
  const calculateCheckpointPosition = (
    checkpoint: TemplateCheckpoint,
    routeData: RouteData
  ): RoutePoint => {
    if (!routeData || routeData.points.length < 2 || !localTemplate) {
      return routeData?.points[0] || { x: 50, y: 50 };
    }

    // Special handling for start/finish checkpoints
    if (
      checkpoint.checkpoint_type === "swim_start" ||
      checkpoint.distance_km === 0
    ) {
      return routeData.points[0]; // First point
    }

    if (
      checkpoint.checkpoint_type === "swim_finish" &&
      !checkpoint.distance_km
    ) {
      return routeData.points[routeData.points.length - 1]; // Last point
    }

    if (!checkpoint.distance_km) {
      // If no distance specified, place in middle of first lap
      const middleIndex = Math.floor(routeData.points.length / 2);
      return routeData.points[middleIndex];
    }

    // Get segment info
    const segmentType = checkpoint.checkpoint_type.startsWith("swim")
      ? "swim"
      : checkpoint.checkpoint_type.startsWith("bike")
      ? "bike"
      : "run";

    const totalDistance = localTemplate[
      `${segmentType}_distance` as keyof Template
    ] as number;
    const laps = routeData.laps || 1;
    const distancePerLap = totalDistance / laps;

    const distanceInLap = checkpoint.distance_km % distancePerLap;
    const progressInLap = distanceInLap / distancePerLap;

    // Find position on route (single lap)
    const totalPoints = routeData.points.length;
    const targetIndex = Math.floor(progressInLap * (totalPoints - 1));
    const nextIndex = Math.min(targetIndex + 1, totalPoints - 1);

    if (targetIndex === nextIndex) {
      return routeData.points[targetIndex];
    }

    // Interpolate between points
    const t = progressInLap * (totalPoints - 1) - targetIndex;
    const current = routeData.points[targetIndex];
    const next = routeData.points[nextIndex];

    return {
      x: current.x + (next.x - current.x) * t,
      y: current.y + (next.y - current.y) * t,
    };
  };

  const getCheckpointColor = (checkpoint: TemplateCheckpoint): string => {
    // Map checkpoint names to colors
    if (checkpoint.checkpoint_type === "swim_start")
      return CHECKPOINT_COLORS.swim_start;
    if (checkpoint.checkpoint_type === "swim_finish")
      return CHECKPOINT_COLORS.swim_finish;
    if (checkpoint.checkpoint_type.startsWith("bike"))
      return CHECKPOINT_COLORS.bike_checkpoints;
    if (checkpoint.checkpoint_type.startsWith("run"))
      return CHECKPOINT_COLORS.run_checkpoints;

    // Default color based on segment
    const segmentType = checkpoint.checkpoint_type.startsWith("swim")
      ? "swim"
      : checkpoint.checkpoint_type.startsWith("bike")
      ? "bike"
      : "run";
    return SEGMENT_COLORS[segmentType as SegmentType];
  };

  const getCheckpointIcon = (checkpoint: TemplateCheckpoint) => {
    if (checkpoint.checkpoint_type === "swim_start") return "start";
    if (checkpoint.checkpoint_type === "swim_finish") return "finish";
    return "checkpoint";
  };

  // Canvas drawing effect
  useEffect(() => {
    if (canvasRef.current && mapImages[currentSegment]) {
      // if (!localTemplate) {
      //   return;
      // }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const mapImage = mapImages[currentSegment];
      if (!ctx || !mapImage) return;

      const maxWidth = 800;
      const maxHeight = 600;
      const scale = Math.min(
        maxWidth / mapImage.width,
        maxHeight / mapImage.height,
        1
      );

      canvas.width = mapImage.width * scale;
      canvas.height = mapImage.height * scale;

      // Draw background image
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

      // Draw saved route for current segment
      const routeData = template?.[
        `${currentSegment}_route_data` as keyof Template
      ] as RouteData;
      if (routeData && routeData.points.length > 1) {
        ctx.strokeStyle = routeData.color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(
          routeData.points[0].x * scale,
          routeData.points[0].y * scale
        );
        routeData.points.forEach((point) => {
          ctx.lineTo(point.x * scale, point.y * scale);
        });
        ctx.stroke();

        // Draw lap indicator
        const laps = routeData.laps || 1;
        if (laps > 1) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(10, 10, 130, 30);
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px Arial";
          ctx.fillText(`${laps} laps on this route`, 15, 30);
        }

        // Draw checkpoints for current segment
        const segmentCheckpoints = checkpoints.filter((cp) =>
          cp.checkpoint_type.startsWith(currentSegment)
        );

        segmentCheckpoints.forEach((checkpoint) => {
          const position = calculateCheckpointPosition(checkpoint, routeData);
          const checkpointColor = getCheckpointColor(checkpoint);
          const iconType = getCheckpointIcon(checkpoint);

          // Draw checkpoint circle
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = checkpointColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(position.x * scale, position.y * scale, 14, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          // Draw checkpoint icon based on type
          ctx.fillStyle = checkpointColor;
          if (iconType === "start") {
            // Draw play icon for start
            ctx.beginPath();
            ctx.moveTo((position.x - 5) * scale, (position.y - 7) * scale);
            ctx.lineTo((position.x + 7) * scale, position.y * scale);
            ctx.lineTo((position.x - 5) * scale, (position.y + 7) * scale);
            ctx.closePath();
            ctx.fill();
          } else if (iconType === "finish") {
            // Draw stop icon for finish
            ctx.fillRect(
              (position.x - 5) * scale,
              (position.y - 5) * scale,
              10 * scale,
              10 * scale
            );
          } else {
            // Draw flag for checkpoints
            ctx.beginPath();
            ctx.moveTo((position.x - 7) * scale, (position.y - 9) * scale);
            ctx.lineTo((position.x + 7) * scale, (position.y - 9) * scale);
            ctx.lineTo((position.x + 7) * scale, (position.y - 2) * scale);
            ctx.lineTo((position.x - 7) * scale, (position.y - 2) * scale);
            ctx.closePath();
            ctx.fill();

            // Draw flag pole
            ctx.strokeStyle = "#333333";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo((position.x - 7) * scale, (position.y - 9) * scale);
            ctx.lineTo((position.x - 7) * scale, (position.y + 9) * scale);
            ctx.stroke();
          }

          // Draw checkpoint label with lap info
          const labelText = checkpoint.name;
          const distanceText =
            checkpoint.distance_km !== null
              ? `${checkpoint.distance_km}km`
              : "";

          // Calculate lap number for display
          const laps = routeData.laps || 1;
          const totalDistance = template[
            `${currentSegment}_distance` as keyof Template
          ] as number;
          const distancePerLap = totalDistance / laps;

          let lapInfo = "";
          if (checkpoint.distance_km && laps > 1) {
            const lapNumber =
              Math.floor(checkpoint.distance_km / distancePerLap) + 1;
            lapInfo = `Lap ${lapNumber}`;
          }

          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.font = "bold 12px Arial";
          ctx.textAlign = "center";

          // Draw name
          ctx.strokeText(
            labelText,
            position.x * scale,
            (position.y - 22) * scale
          );
          ctx.fillText(
            labelText,
            position.x * scale,
            (position.y - 22) * scale
          );

          // Draw distance and lap info
          if (distanceText || lapInfo) {
            ctx.font = "10px Arial";
            const infoText = [distanceText, lapInfo]
              .filter(Boolean)
              .join(" - ");
            ctx.strokeText(
              infoText,
              position.x * scale,
              (position.y - 34) * scale
            );
            ctx.fillText(
              infoText,
              position.x * scale,
              (position.y - 34) * scale
            );
          }
        });
      }

      // Draw current route being drawn
      if (currentRoute.length > 1) {
        ctx.strokeStyle = SEGMENT_COLORS[currentSegment];
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(currentRoute[0].x * scale, currentRoute[0].y * scale);
        currentRoute.forEach((point) => {
          ctx.lineTo(point.x * scale, point.y * scale);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [mapImages, currentSegment, currentRoute, localTemplate, checkpoints]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFiles((prev) => ({ ...prev, [currentSegment]: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setMapImages((prev) => ({ ...prev, [currentSegment]: img }));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasMouseDown = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const mapImage = mapImages[currentSegment];
    if (!mapImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = mapImage.width / canvas.width;
    const scaleY = mapImage.height / canvas.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setCurrentRoute([{ x, y }]);
  };

  const handleCanvasMouseMove = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const mapImage = mapImages[currentSegment];
    if (!mapImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = mapImage.width / canvas.width;
    const scaleY = mapImage.height / canvas.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    setCurrentRoute((prev) => [...prev, { x, y }]);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const saveCurrentRoute = async () => {
    if (currentRoute.length < 2) return;
    const file = imageFiles[currentSegment];
    const imageUrl = await uploadMapImage(file, currentSegment);
    const routeData: SegmentRoutData = {
      segmentType: currentSegment,
      points: [...currentRoute],
      color: SEGMENT_COLORS[currentSegment],
      templateId: templateId,
      segmentMapUrl: imageUrl,
    };
    costam.mutate(routeData);
    setCurrentRoute([]);
    toast.success(`Route saved for ${currentSegment}`);
  };

  const clearCurrentRoute = () => {
    setCurrentRoute([]);
    toast.success(`Route cleared for ${currentSegment}`);
  };

  const uploadMapImage = async (
    file: File | undefined,
    segment: SegmentType
  ): Promise<string> => {
    if (!file) return "";

    const fileExt = file.name.split(".").pop();
    const fileName = `template-${templateId}-${segment}-${Date.now()}.${fileExt}`;
    const filePath = `maps/${fileName}`;

    const { error } = await supabase.storage
      .from("triathlon-maps")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("triathlon-maps").getPublicUrl(filePath);

    return publicUrl;
  };

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
          <h1 className="text-2xl font-bold">Edit Template</h1>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="route">Route Maps</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
        </TabsList>

        {template ? (
          <>
            <TabsContent value="basic">
              <BasicInfoTab template={template} />
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
          </>
        ) : (
          <TabsContent value="basic">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Template information
                  </CardTitle>
                </CardHeader>
                <CardContent>loading content ...</CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
