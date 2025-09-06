"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { calculateRunPace, durationToSeconds } from "@/lib/supabase-utils";
import { useAthleteTimeOnGivenCheckpoint } from "@/lib/queries";
import { Athlete, AthleteTime, RoutePoint, Template } from "@/lib/supabase-types";

interface Runner extends Athlete {
  startTime?: Date;
  color: string;
  currentPosition: number;
  distanceCovered: number;
  isActive: boolean;
  hasStarted: boolean;
}

interface RunSimulationProps {
  template: Template;
  athletes: Athlete[];
  runStartCheckpointId: number;
  mapImageUrl?: string;
  routePoints?: RoutePoint[];
}

export default function RunSimulation({
  template,
  athletes,
  runStartCheckpointId,
}: RunSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [runners, setRunners] = useState<Runner[]>([]);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  const routePoints = template?.run_route_data?.points || [];
  const mapImageUrl =
    template?.run_map_url || "/placeholder.svg?height=600&width=800&text=Run+Route+Map";

  const { data: checkpointData, isLoading, error } =
    useAthleteTimeOnGivenCheckpoint(runStartCheckpointId);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMapImage(img);
    img.src = mapImageUrl;
  }, [mapImageUrl]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const calculateRunnerPosition = (
    athlete: Athlete,
    checkpoint: AthleteTime | undefined
  ) => {
    if (!checkpoint?.actual_time) return defaultState(false);

    const startTime = new Date(checkpoint.actual_time);
    const hasStarted = currentTime >= startTime;
    if (!hasStarted) return defaultState(false);

    const timeElapsed = (currentTime.getTime() - startTime.getTime()) / 1000;
    const totalDuration = durationToSeconds(athlete.predicted_run_time);
    const totalDistance = template.run_distance * 1000;
    const distance = Math.min((timeElapsed / totalDuration) * totalDistance, totalDistance);

    return {
      currentPosition: 0,
      distanceCovered: distance,
      isActive: distance < totalDistance,
      hasStarted: true,
    };
  };

  function defaultState(started: boolean) {
    return {
      currentPosition: 0,
      distanceCovered: 0,
      isActive: false,
      hasStarted: started,
    };
  }

  const calculateCanvasPosition = (runner: Runner) => {
    if (!runner.hasStarted || !routePoints.length) return { x: 0, y: 0 };

    const total = template.run_distance * 1000;
    const progress = Math.min(runner.distanceCovered / total, 1);
    const segIndex = Math.floor(progress * (routePoints.length - 1));
    const segProg = progress * (routePoints.length - 1) - segIndex;
    const current = routePoints[segIndex] || routePoints[0];
    const next = routePoints[segIndex + 1] || current;

    return {
      x: current.x + (next.x - current.x) * segProg,
      y: current.y + (next.y - current.y) * segProg,
    };
  };

  useEffect(() => {
    if (!canvasRef.current || !mapImage || !routePoints.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = Math.min(800 / mapImage.width, 600 / mapImage.height, 1);
    canvas.width = mapImage.width * scale;
    canvas.height = mapImage.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    if (routePoints.length > 1) {
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(routePoints[0].x * scale, routePoints[0].y * scale);
      routePoints.forEach((p) => ctx.lineTo(p.x * scale, p.y * scale));
      ctx.stroke();
    }

    runners.forEach((runner) => {
      if (!runner.hasStarted) return;

      const { x, y } = calculateCanvasPosition(runner);
      ctx.fillStyle = runner.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x * scale, y * scale, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(runner.currentPosition.toString(), x * scale, y * scale + 4);
    });
  }, [mapImage, runners, routePoints, currentTime]);

  useEffect(() => {
    if (!checkpointData || athletes.length === 0) return;

    const palette = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
    const updated = athletes.map((athlete, i) => {
      const cp = checkpointData.find((c) => c.athlete_id === Number(athlete.id));
      const pos = calculateRunnerPosition(athlete, cp);
      return {
        ...athlete,
        startTime: cp?.actual_time ? new Date(cp.actual_time) : undefined,
        color: palette[i % palette.length],
        ...pos,
      };
    });

    const ranked = [...updated].sort((a, b) => b.distanceCovered - a.distanceCovered);
    const final = updated.map((runner) => ({
      ...runner,
      currentPosition: runner.hasStarted
        ? ranked.findIndex((c) => c.id === runner.id) + 1
        : 0,
    }));

    setRunners(final);
  }, [checkpointData, athletes, currentTime]);

  if (isLoading)
    return (
      <Card>
        <CardContent className="p-8 text-center">Loading simulation...</CardContent>
      </Card>
    );

  if (error)
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-600">
          Error loading data: {error.message}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            Live Preview - Running Checkpoint {runStartCheckpointId}
            <span className="text-sm font-normal text-muted-foreground">
              Updated: {currentTime.toLocaleTimeString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <canvas ref={canvasRef} className="max-w-full h-auto border rounded bg-gray-50" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {runners
                .sort((a, b) => a.currentPosition - b.currentPosition)
                .map((runner) => {
                  const total = template.run_distance * 1000;
                  const progress = (runner.distanceCovered / total) * 100;
                  const finished = progress >= 100;
                  return (
                    <Card
                      key={runner.id}
                      className={`${
                        finished
                          ? "ring-2 ring-green-500"
                          : runner.isActive
                          ? "ring-1 ring-blue-300"
                          : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center"
                            style={{ backgroundColor: runner.color }}
                          >
                            {runner.currentPosition || "—"}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{runner.name}</h3>
                            <div className="flex gap-2">
                              {finished && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  SKOŃCZYŁ
                                </span>
                              )}
                              {runner.isActive && !finished && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  BIEGNIE
                                </span>
                              )}
                              {!runner.hasStarted && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                  OCZEKUJE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Dystans:</span>
                            <span className="font-mono">
                              {Math.round(runner.distanceCovered)}m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Progress:</span>
                            <span className="font-mono">{progress.toFixed(1)}%</span>
                          </div>
                          {runner.hasStarted && (
                            <div className="flex justify-between">
                              <span>Current Pace:</span>
                              <span className="font-mono">
                                {calculateRunPace(runner.predicted_run_time, template.run_distance)}{" "}
                                km/h
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 h-3 rounded-full mt-3">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${Math.max(progress, 2)}%`,
                              backgroundColor: runner.color,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
            {runners.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-8">
                No athlete data found for this checkpoint.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
