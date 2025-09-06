"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import {
  calculateRunPace,
  durationToSeconds,
  formatTimeDiff,
} from "@/lib/supabase-utils";
import { useAthleteTimeOnGivenCheckpoint } from "@/lib/queries";
import type {
  Athlete,
  AthleteTime,
  AthleteTimeWithDistance,
  RoutePoint,
  Template,
} from "@/lib/supabase-types";

interface Runner extends Athlete {
  startTime?: Date;
  color: string;
  currentPosition: number;
  distanceCovered: number;
  isActive: boolean;
  hasStarted: boolean;
  currentLap: number;
  totalLaps: number;
  distanceSinceT2: number;
}

interface RunSimulationProps {
  template: Template;
  athletes: Runner[];
  runStartCheckpointId: number;
  mapImageUrl?: string;
  routePoints?: RoutePoint[];
}

export default function RunSimulation({
  template,
  athletes,
  runStartCheckpointId,
}: RunSimulationProps) {
  const MAX_PREDICTED_PACE = 10; // 10 km/h (6 min/km)
  const MIN_PREDICTED_PACE = 8.5; // 8.5 km/h (7 min/km)

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [runners, setRunners] = useState<Runner[]>([]);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  const totalLaps = template?.run_route_data?.laps || 1;
  const routePoints = template?.run_route_data?.points || [];
  const mapImageUrl =
    template?.run_map_url ||
    "/placeholder.svg?height=600&width=800&text=Run+Route+Map";

  const lapDistance = (template.run_distance * 1000) / totalLaps; // Distance per lap in meters

  const {
    data: checkpointData,
    isLoading,
    error,
  } = useAthleteTimeOnGivenCheckpoint(runStartCheckpointId);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMapImage(img);
    img.src = mapImageUrl;
  }, [mapImageUrl]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 2500);
    return () => clearInterval(interval);
  }, []);

  const calculateRunnerPosition = (
    athlete: Runner,
    checkpoint: AthleteTimeWithDistance | undefined
  ) => {
    if (!checkpoint?.actual_time) return defaultState(false);

    const startTime = new Date(checkpoint.actual_time);
    const hasStarted = currentTime >= startTime;
    if (!hasStarted) return defaultState(false);

    const timeElapsed = (currentTime.getTime() - startTime.getTime()) / 1000;
    const totalDuration = durationToSeconds(athlete.predicted_run_time);
    const totalDistance = template.run_distance * 1000; // Total distance across all laps

    const distance = Math.min(
      (timeElapsed / totalDuration) * totalDistance +
        checkpoint.distance * 1000,
      totalDistance
    );

    const currentLap = Math.floor(distance / lapDistance) + 1;
    const clampedLap = Math.min(currentLap, totalLaps);

    return {
      currentPosition: 0,
      distanceCovered: distance,
      isActive: distance < totalDistance,
      hasStarted: true,
      currentLap: clampedLap,
      totalLaps: totalLaps,
    };
  };

  const calculatePacePosition = (
    athlete: Runner,
    targetPace: number,
    checkpoint: AthleteTime | undefined
  ) => {
    if (!checkpoint?.actual_time) return null;

    const startTime = new Date(checkpoint.actual_time);
    const hasStarted = currentTime >= startTime;
    if (!hasStarted) return null;

    const timeElapsed = (currentTime.getTime() - startTime.getTime()) / 1000;
    const totalDistance = template.run_distance * 1000;

    const paceMs = (targetPace * 1000) / 3600;
    const distanceAtPace = Math.min(
      paceMs * timeElapsed + athlete.distanceSinceT2,
      totalDistance
    );

    if (distanceAtPace <= 0) return null;

    const distanceInCurrentLap = Math.floor(distanceAtPace % lapDistance);
    const progress = Math.min(distanceInCurrentLap / lapDistance, 1);

    const segIndex = Math.floor(progress * (routePoints.length - 1));
    const segProg = progress * (routePoints.length - 1) - segIndex;
    const current = routePoints[segIndex] || routePoints[0];
    const next = routePoints[segIndex + 1] || current;

    return {
      x: current.x + (next.x - current.x) * segProg,
      y: current.y + (next.y - current.y) * segProg,
    };
  };

  function defaultState(started: boolean) {
    return {
      currentPosition: 0,
      distanceCovered: 0,
      isActive: false,
      hasStarted: started,
      currentLap: started ? 1 : 0,
      totalLaps: totalLaps,
    };
  }

  const calculateCanvasPosition = (runner: Runner) => {
    if (!runner.hasStarted || !routePoints.length) return { x: 0, y: 0 };

    const distanceInCurrentLap = runner.distanceCovered % lapDistance;
    const progress = Math.min(distanceInCurrentLap / lapDistance, 1);

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

    const scale = Math.min(800 / mapImage.width, 600 / mapImage.height);
    const scaledWidth = mapImage.width * scale;
    const scaledHeight = mapImage.height * scale;

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0, scaledWidth, scaledHeight);

    if (routePoints.length > 1) {
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(routePoints[0].x * scale, routePoints[0].y * scale);
      for (let i = 1; i < routePoints.length; i++) {
        ctx.lineTo(routePoints[i].x * scale, routePoints[i].y * scale);
      }
      ctx.stroke();
    }

    runners.forEach((runner) => {
      if (!runner.hasStarted) return;

      const checkpoint = checkpointData?.find(
        (c) => c.athlete_id === Number(runner.id)
      );
      const posFast = calculatePacePosition(
        runner,
        MAX_PREDICTED_PACE,
        checkpoint
      );
      const posSlow = calculatePacePosition(
        runner,
        MIN_PREDICTED_PACE,
        checkpoint
      );

      if (posFast && posSlow) {
        ctx.globalAlpha = 1;
        ctx.beginPath();

        const total = template.run_distance * 1000;
        const timeElapsed =
          (currentTime.getTime() -
            new Date(checkpoint?.actual_time || 0).getTime()) /
          1000;

        const paceFastMs = (MAX_PREDICTED_PACE * 1000) / 3600;
        const paceSlowMs = (MIN_PREDICTED_PACE * 1000) / 3600;

        const distanceFast = Math.min(
          paceFastMs * timeElapsed + runner.distanceSinceT2,
          total
        );
        const distanceSlow = Math.min(
          paceSlowMs * timeElapsed + runner.distanceSinceT2,
          total
        );

        const distanceInCurrentLapSlow = Math.floor(distanceSlow % lapDistance);
        const distanceInCurrentLapFast = Math.floor(distanceFast % lapDistance);

        const progressFast = Math.min(
          distanceInCurrentLapFast / lapDistance,
          1
        );
        const progressSlow = Math.min(
          distanceInCurrentLapSlow / lapDistance,
          1
        );

        const startIndex = Math.floor(progressSlow * routePoints.length);
        const endIndex = Math.floor(progressFast * (routePoints.length - 1));

        if (startIndex < endIndex) {
          ctx.moveTo(posSlow.x * scale, posSlow.y * scale);
          for (let i = startIndex; i <= endIndex; i++) {
            const point = routePoints[i];
            ctx.lineTo(point.x * scale, point.y * scale);
          }
          ctx.lineTo(posFast.x * scale, posFast.y * scale);
          ctx.lineWidth = 4;

          const gradient = ctx.createLinearGradient(
            posSlow.x * scale,
            posSlow.y * scale,
            posFast.x * scale,
            posFast.y * scale
          );
          gradient.addColorStop(0, "#3B82F6"); // Green for slower pace
          gradient.addColorStop(1, "#EC4899"); // Orange for faster pace

          ctx.strokeStyle = gradient;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    });

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
  }, [mapImage, runners, routePoints, totalLaps, currentTime, checkpointData]);

  useEffect(() => {
    if (!checkpointData || athletes.length === 0) return;

    const palette = [
      "#3B82F6",
      "#EF4444",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#EC4899",
    ];
    const updated = athletes.map((athlete, i) => {
      const cp = checkpointData.find(
        (c) => c.athlete_id === Number(athlete.id)
      );
      const pos = calculateRunnerPosition(athlete, cp);
      return {
        ...athlete,
        startTime: cp?.actual_time ? new Date(cp.actual_time) : undefined,
        color: palette[i % palette.length],
        ...pos,
      };
    });

    const ranked = [...updated].sort(
      (a, b) => b.distanceCovered - a.distanceCovered
    );

    const final = updated.map((runner) => {
      // Find T2 checkpoint finished time
      const t2Finished = runner.times?.find((t) =>
        t?.checkpoint.checkpoint_type.includes("t2")
      )?.actual_time;

      // Get all run checkpoints
      const runCheckpoints = runner.times?.filter((t) =>
        t?.checkpoint.checkpoint_type.includes("run")
      );

      // Get the last run checkpoint
      const lastRunCheckpoint = runCheckpoints?.slice(-1)[0];
      const lastCheckpointTime = lastRunCheckpoint?.actual_time || null;

      // Calculate time since T2
      const timeSinceT2 =
        t2Finished && lastCheckpointTime
          ? formatTimeDiff(t2Finished, lastCheckpointTime)
          : null;

      // Calculate distance since T2
      const distanceSinceT2 = lastRunCheckpoint?.checkpoint.distance_km
        ? lastRunCheckpoint.checkpoint.distance_km * 1000
        : 0;

      return {
        ...runner,
        currentPosition: runner.hasStarted
          ? ranked.findIndex((c) => c.id === runner.id) + 1
          : 0,
        distanceSinceT2,
        timeSinceT2,
      };
    });

    setRunners(final);
  }, [checkpointData, athletes, currentTime]);

  if (isLoading)
    return (
      <Card>
        <CardContent className="p-8 text-center">
          Loading simulation...
        </CardContent>
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
          <CardTitle className="flex flex-col gap-1">
            <div>Podgląd na żywo - Bieg</div>
            <div className="text-sm font-normal text-muted-foreground pl-2">
              Odświeżono:
              {currentTime.toLocaleTimeString("en-GB", { hour12: false })}
            </div>
            {totalLaps > 1 && (
              <div className="text-sm font-normal text-muted-foreground">
                {totalLaps} Okrążeń - {(lapDistance / 1000).toFixed(1)}km każde
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto border rounded bg-gray-50"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {runners
                .sort((a, b) => a.currentPosition - b.currentPosition)
                .map((runner) => {
                  const total = template.run_distance * 1000;
                  const progress = (runner.distanceCovered / total) * 100;
                  const finished = progress >= 100;

                  const t2Finished = runner.times?.find((t) =>
                    t?.checkpoint.checkpoint_type.includes("t2")
                  )?.actual_time;
                  const filtered1 = runner.times?.filter((t) =>
                    t?.checkpoint.checkpoint_type.includes("run")
                  );
                  const lastRunCheckpoint = filtered1?.slice(-1)[0];
                  const lastCheckpointTime =
                    lastRunCheckpoint?.actual_time || null;
                  const timeSinceT2 = formatTimeDiff(
                    t2Finished,
                    lastCheckpointTime
                  );
                  const distanceSinceT2 =
                    lastRunCheckpoint?.checkpoint.distance_km || 0;

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
                              {runner.hasStarted && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  OKRĄŻENIE {runner.currentLap}/
                                  {runner.totalLaps}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          {runner.hasStarted && (
                            <div className="flex justify-between">
                              <span>Okrążenie:</span>
                              <span className="font-mono">
                                {runner.currentLap} z {runner.totalLaps}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Dystans(+/-):</span>
                            <span className="font-mono">
                              {Math.round(runner.distanceCovered)}m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Progres:</span>
                            <span className="font-mono">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          {runner.hasStarted && (
                            <>
                              <div className="flex justify-between">
                                <span>Przewidziane tempo:</span>
                                <span className="font-mono">
                                  {calculateRunPace(
                                    runner.predicted_run_time,
                                    template.run_distance
                                  )}{" "}
                                  km/h
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Średnie tempo:</span>
                                <span className="font-mono">
                                  {calculateRunPace(
                                    timeSinceT2,
                                    distanceSinceT2
                                  )}{" "}
                                  km/h
                                </span>
                              </div>
                            </>
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
                Brak sportowców na tym odcinku.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
