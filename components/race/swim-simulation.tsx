"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { calculateSwimPace, durationToSeconds } from "@/lib/supabase-utils";
import { useAthleteTimeOnGivenCheckpoint } from "@/lib/queries";
import {
  Athlete,
  AthleteTime,
  RoutePoint,
  Template,
} from "@/lib/supabase-types";

interface Swimmer extends Athlete {
  startTime?: Date;
  color: string;
  currentPosition: number;
  distanceSwum: number;
  isActive: boolean;
  hasStarted: boolean;
}

interface SimulationTabProps {
  template: Template;
  athletes: Athlete[];
  swimStartCheckpointId: number;
}

export default function SwimSimulation({
  template,
  athletes,
  swimStartCheckpointId,
}: SimulationTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  const routePoints = template?.swim_route_data?.points || [];
  const mapImageUrl =
    template?.swim_map_url ||
    "/placeholder.svg?height=600&width=800&text=Swimming+Route+Map";

  const { data: athleteCheckpointData, isLoading, error } =
    useAthleteTimeOnGivenCheckpoint(swimStartCheckpointId);

  // Tick clock every 10s
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Load map image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMapImage(img);
    img.src = mapImageUrl;
  }, [mapImageUrl]);



  const getSwimmerData = (athlete: Athlete, checkpoint: AthleteTime | undefined, color: string): Swimmer => {
    const totalDistance = template.swim_distance * 1000;
    const startTime = checkpoint?.actual_time ? new Date(checkpoint.actual_time) : undefined;
    const hasStarted = !!startTime && currentTime >= startTime;
    const totalSwimTimeSeconds = durationToSeconds(athlete.predicted_swim_time);
    const timeSwimmingSeconds = startTime ? (currentTime.getTime() - startTime.getTime()) / 1000 : 0;
    const distanceSwum = hasStarted
      ? Math.min(totalDistance, (timeSwimmingSeconds / totalSwimTimeSeconds) * totalDistance)
      : 0;

    return {
      ...athlete,
      startTime,
      color,
      hasStarted,
      isActive: hasStarted && distanceSwum < totalDistance,
      distanceSwum: Math.max(0, distanceSwum),
      currentPosition: 0, // to be set later
    };
  };

  useEffect(() => {
    if (!athleteCheckpointData || athletes.length === 0) return;

    const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

    const swimmerList = athletes.map((athlete, i) =>
      getSwimmerData(
        athlete,
        athleteCheckpointData.find((d) => d.athlete_id === Number(athlete.id)),
        colors[i % colors.length]
      )
    );

    const sorted = [...swimmerList].sort((a, b) => b.distanceSwum - a.distanceSwum);
    const withPosition = swimmerList.map((swimmer) => ({
      ...swimmer,
      currentPosition: swimmer.hasStarted
        ? sorted.findIndex((s) => s.id === swimmer.id) + 1
        : 0,
    }));

    setSwimmers(withPosition);
  }, [athleteCheckpointData, athletes, currentTime]);

  const getCanvasPosition = (swimmer: Swimmer) => {
    if (!swimmer.hasStarted || routePoints.length < 2) return routePoints[0] || { x: 0, y: 0 };

    const totalDistance = template.swim_distance * 1000;
    const progress = Math.min(swimmer.distanceSwum / totalDistance, 1);
    const index = Math.floor(progress * (routePoints.length - 1));
    const segProgress = progress * (routePoints.length - 1) - index;

    const start = routePoints[index] || routePoints[0];
    const end = routePoints[index + 1] || start;

    return {
      x: start.x + (end.x - start.x) * segProgress,
      y: start.y + (end.y - start.y) * segProgress,
    };
  };

  useEffect(() => {
    if (!canvasRef.current || !mapImage || routePoints.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = Math.min(800 / mapImage.width, 600 / mapImage.height, 1);
    canvas.width = mapImage.width * scale;
    canvas.height = mapImage.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    if (routePoints.length > 1) {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(routePoints[0].x * scale, routePoints[0].y * scale);
      routePoints.forEach((p) => ctx.lineTo(p.x * scale, p.y * scale));
      ctx.stroke();

      const drawMarker = (point: RoutePoint, color: string, label: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x * scale, point.y * scale, 12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, point.x * scale, point.y * scale + 4);
      };

      drawMarker(routePoints[0], "#10B981", "S");
      drawMarker(routePoints[routePoints.length - 1], "#EF4444", "F");
    }

    swimmers.forEach((swimmer) => {
      if (!swimmer.hasStarted) return;
      const pos = getCanvasPosition(swimmer);
      ctx.fillStyle = swimmer.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x * scale, pos.y * scale, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(String(swimmer.currentPosition), pos.x * scale, pos.y * scale + 4);

      ctx.font = "bold 14px Arial";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.strokeText(swimmer.name, pos.x * scale, (pos.y - 20) * scale);
      ctx.fillStyle = swimmer.color;
      ctx.fillText(swimmer.name, pos.x * scale, (pos.y - 20) * scale);
    });
  }, [mapImage, swimmers, routePoints, currentTime]);

  if (isLoading) {
    return <LoadingCard message="Loading race simulation..." />;
  }

  if (error) {
    return <LoadingCard error={`Error loading race data: ${error.message}`} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Live Preview - Swimming Checkpoint {swimStartCheckpointId}
            <span className="text-sm text-muted-foreground">
              Updated: {currentTime.toLocaleTimeString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 border rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="max-w-full h-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {swimmers
                .sort((a, b) => a.currentPosition - b.currentPosition)
                .map((swimmer) => (
                  <SwimmerCard key={swimmer.id} swimmer={swimmer} template={template} />
                ))}
            </div>

            {swimmers.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                No athlete data found for this checkpoint.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingCard({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-8 text-center">
          <p className={error ? "text-red-600" : ""}>{error || message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SwimmerCard({ swimmer, template }: { swimmer: Swimmer; template: Template }) {
  const totalDistance = template.swim_distance * 1000;
  const progress = (swimmer.distanceSwum / totalDistance) * 100;
  const isFinished = progress >= 100;

  const status = !swimmer.hasStarted
    ? "WAITING"
    : isFinished
    ? "FINISHED"
    : "SWIMMING";

  const statusColor = {
    WAITING: "bg-orange-100 text-orange-800",
    FINISHED: "bg-green-100 text-green-800",
    SWIMMING: "bg-blue-100 text-blue-800",
  }[status];

  return (
    <Card
      className={`${isFinished ? "ring-2 ring-green-500" : ""} ${
        swimmer.isActive ? "ring-1 ring-blue-300" : ""
      }`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: swimmer.color }}
          >
            {swimmer.currentPosition || "—"}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{swimmer.name}</h3>
            <span className={`text-xs px-2 py-1 rounded ${statusColor}`}>
              {status}
            </span>
          </div>
        </div>
        <div className="text-sm">
          <div className="flex justify-between">
            <span>Distance:</span>
            <span className="font-mono">{Math.round(swimmer.distanceSwum)}m</span>
          </div>
          <div className="flex justify-between">
            <span>Progress:</span>
            <span className="font-mono">{progress.toFixed(1)}%</span>
          </div>
          {swimmer.hasStarted && (
            <div className="flex justify-between">
              <span>Current Pace:</span>
              <span className="font-mono">
                {calculateSwimPace(
                  swimmer.predicted_swim_time,
                  template.swim_distance
                )}
                min/100m
              </span>
            </div>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
          <div
            className="h-3 rounded-full flex items-center justify-end pr-1 transition-all duration-1000"
            style={{
              width: `${Math.max(progress, 2)}%`,
              backgroundColor: swimmer.color,
            }}
          >
            {progress > 10 && (
              <span className="text-xs text-white font-bold">
                {swimmer.currentPosition || "—"}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
