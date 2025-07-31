"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  supabase,
  type Template,
  type TemplateCheckpoint,
  type RouteData,
} from "@/lib/supabase-utils";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { BasicInfoTab } from "@/components/admin/tabs/basic-info-tab";
import { RouteMapsTab } from "@/components/admin/tabs/route-maps-tab";
import { CheckpointsTab } from "@/components/admin/tabs/checkpoints-tab";
import { SimulationTab } from "@/components/admin/tabs/simulation-tab";
import Link from "next/link";
import { useCheckpoints, useTemplate, useUpdateTemplate } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoutePoint } from "@/lib/supabase-types";

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
  const updateTemplateMutation = useUpdateTemplate();

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

  const saveCurrentRoute = () => {
    if (currentRoute.length < 2) return;

    // Get existing route data or create new one
    const existingRouteData = localTemplate?.[
      `${currentSegment}_route_data` as keyof Template
    ] as RouteData;
    const laps = existingRouteData?.laps || 1;

    const routeData: RouteData = {
      points: [...currentRoute],
      color: SEGMENT_COLORS[currentSegment],
      laps: laps,
    };

    setLocalTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [`${currentSegment}_route_data`]: routeData,
      };
    });

    setCurrentRoute([]);
    toast.success(`Route saved for ${currentSegment}`);
  };

  const clearCurrentRoute = () => {
    setLocalTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [`${currentSegment}_route_data`]: null,
      };
    });
    setCurrentRoute([]);
    toast.success(`Route cleared for ${currentSegment}`);
  };

  const uploadMapImage = async (
    file: File,
    segment: SegmentType
  ): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `template-${templateId}-${segment}-${Date.now()}.${fileExt}`;
    const filePath = `maps/${fileName}`;

    const { data, error } = await supabase.storage
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

  const saveTemplate = async () => {
    if (!localTemplate) return;

    try {
      const updateData: any = {
        ...localTemplate,
        id: templateId,
      };

      // Upload new images and update URLs
      const segments: SegmentType[] = ["swim", "bike", "run"];
      for (const segment of segments) {
        const file = imageFiles[segment];
        if (file) {
          const imageUrl = await uploadMapImage(file, segment);
          updateData[`${segment}_map_url`] = imageUrl;
        }
      }

      await updateTemplateMutation.mutateAsync(updateData);
      toast.success("Template saved successfully");
      setImageFiles({}); // Clear uploaded files
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  // Update local template when template changes are made
  const updateLocalTemplate = (updates: Partial<Template>) => {
    setLocalTemplate((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
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
        <div className="flex gap-2">
          <Button
            onClick={saveTemplate}
            disabled={updateTemplateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateTemplateMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="route">Route Maps</TabsTrigger>
          <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
        </TabsList>

        {localTemplate ? (
          <>
            <TabsContent value="basic">
              <BasicInfoTab
                template={localTemplate}
                onUpdateTemplate={updateLocalTemplate}
              />
            </TabsContent>

            <TabsContent value="route">
              <RouteMapsTab
                template={localTemplate}
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
