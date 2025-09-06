"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { calculateBikeSpeed, durationToSeconds, formatTimeDiff } from "@/lib/supabase-utils";
import { useAthleteTimeOnGivenCheckpoint } from "@/lib/queries";
import type {
  Athlete,
  AthleteTime,
  AthleteTimeWithDistance,
  RoutePoint,
  Template,
} from "@/lib/supabase-types";

interface Cyclist extends Athlete {
  startTime?: Date;
  color: string;
  currentPosition: number;
  distanceCovered: number;
  isActive: boolean;
  hasStarted: boolean;
  currentLap: number;
  totalLaps: number;
  distanceSinceT1: number
}

interface SimulationTabProps {
  template: Template;
  athletes: Cyclist[];
  bikeStartCheckpointId: number;
  mapImageUrl?: string;
  routePoints?: RoutePoint[];
}

export default function BikeSimulation({
  template,
  athletes,
  bikeStartCheckpointId,
}: SimulationTabProps) {
  const MAX_PREDICTED_SPEED = 30;
  const MIN_PREDICTED_SPEED = 25;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [cyclists, setCyclists] = useState<Cyclist[]>([]);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  const totalLaps = template?.bike_route_data?.laps || 1;
  const routePoints = template?.bike_route_data?.points || [];
  const mapImageUrl =
    template?.bike_map_url ||
    "/placeholder.svg?height=600&width=800&text=Bicycle+Route+Map";

  const lapDistance = (template.bike_distance * 1000) / totalLaps; // Distance per lap in meters
  const {
    data: checkpointData,
    isLoading,
    error,
  } = useAthleteTimeOnGivenCheckpoint(bikeStartCheckpointId);

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

  const calculateCyclistPosition = (
    athlete: Cyclist,
    checkpoint: AthleteTimeWithDistance | undefined
  ) => {
    if (!checkpoint?.actual_time) return defaultState(false);

    const startTime = new Date(checkpoint.actual_time);
    const hasStarted = currentTime >= startTime;
    if (!hasStarted) return defaultState(false);

    const timeElapsed = (currentTime.getTime() - startTime.getTime()) / 1000;
    const totalDuration = durationToSeconds(athlete.predicted_bike_time);
    const totalDistance = template.bike_distance * 1000; // Total distance across all laps
    // console.log("as",checkpoint.distance*1000,
    //   (timeElapsed / totalDuration) * totalDistance+checkpoint.distance*1000,
    //   totalDistance
    // )
    const distance = Math.min(
      (timeElapsed / totalDuration) * totalDistance+checkpoint.distance*1000,
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

  const calculateSpeedPosition = (
    athlete: Cyclist,
    targetSpeed: number,
    checkpoint: AthleteTime | undefined
  ) => {
    if (!checkpoint?.actual_time) return null;
    console.log(athlete,'ATHLETE')
    const startTime = new Date(checkpoint.actual_time);
    const hasStarted = currentTime >= startTime;
    if (!hasStarted) return null;

    const timeElapsed = (currentTime.getTime() - startTime.getTime()) / 1000;
    const totalDistance = template.bike_distance * 1000; // Total distance across all laps

    const speedMs = (targetSpeed * 1000) / 3600;
    const distanceAtSpeed = Math.min(speedMs * timeElapsed+athlete.distanceSinceT1, totalDistance);

    if (distanceAtSpeed <= 0) return null;

    const distanceInCurrentLap = Math.floor(distanceAtSpeed % lapDistance);
    const progress = Math.min(distanceInCurrentLap / lapDistance, 1);
    console.log(progress)
    // const progress = distanceAtSpeed / totalDistance
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

  const calculateCanvasPosition = (cyclist: Cyclist) => {
    if (!cyclist.hasStarted || !routePoints.length) return { x: 0, y: 0 };

    const distanceInCurrentLap = cyclist.distanceCovered % lapDistance;
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
    if (!canvasRef.current || !routePoints.length || !mapImage) return;

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
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(routePoints[0].x * scale, routePoints[0].y * scale);
      for (let i = 1; i < routePoints.length; i++) {
        ctx.lineTo(routePoints[i].x * scale, routePoints[i].y * scale);
      }
      ctx.stroke();
    }

    cyclists.forEach((cyclist) => {
      if (!cyclist.hasStarted) return;
      console.log(cyclist,'CYC')
      const checkpoint = checkpointData?.find(
        (c) => c.athlete_id === Number(cyclist.id)
      );
      const pos30 = calculateSpeedPosition(
        cyclist,
        MAX_PREDICTED_SPEED,
        checkpoint
      );
      const pos25 = calculateSpeedPosition(
        cyclist,
        MIN_PREDICTED_SPEED,
        checkpoint
      );
      // console.log(pos25,pos30)
      if (pos30 && pos25) {
        ctx.globalAlpha = 1;
        ctx.beginPath();

        const total = template.bike_distance * 1000;
        const timeElapsed =
          (currentTime.getTime() -
            new Date(checkpoint?.actual_time || 0).getTime()) /
          1000;


const speed30Ms = (MAX_PREDICTED_SPEED * 1000) / 3600;
const speed25Ms = (MIN_PREDICTED_SPEED * 1000) / 3600;

console.log(speed30Ms * timeElapsed,cyclist.distanceSinceT1)
        const distance30 = Math.min((speed30Ms * timeElapsed)+cyclist.distanceSinceT1, total);
        const distance25 = Math.min((speed25Ms * timeElapsed)+cyclist.distanceSinceT1, total);

        const distanceInCurrentLap25 = Math.floor(distance25 % lapDistance);
        const distanceInCurrentLap30 = Math.floor(distance30 % lapDistance);

        const progress30 = Math.min(distanceInCurrentLap30 / lapDistance, 1);
        const progress25 = Math.min(distanceInCurrentLap25 / lapDistance, 1);
        // console.log(progress25,progress30,distance25,distance30)
        const startIndex = Math.floor(progress25 * routePoints.length);
        const endIndex = Math.floor(progress30 * (routePoints.length - 1));

        if (startIndex < endIndex) {
          ctx.moveTo(pos25.x * scale, pos25.y * scale);
          for (let i = startIndex; i <= endIndex; i++) {
            const point = routePoints[i];
            ctx.lineTo(point.x * scale, point.y * scale);
          }
          ctx.lineTo(pos30.x * scale, pos30.y * scale);
          ctx.lineWidth = 4;

          const gradient = ctx.createLinearGradient(
            pos25.x * scale,
            pos25.y * scale,
            pos30.x * scale,
            pos30.y * scale
          );
          gradient.addColorStop(0, "#3B82F6"); // kolor na początku
          gradient.addColorStop(1, "#EC4899"); // kolor na końcu

          ctx.strokeStyle = gradient; // ustawiamy gradient jako kolor linii
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    });

    cyclists.forEach((cyclist) => {
      if (!cyclist.hasStarted) return;

      const position = calculateCanvasPosition(cyclist);

      ctx.fillStyle = cyclist.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(position.x * scale, position.y * scale, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        cyclist.currentPosition.toString(),
        position.x * scale,
        position.y * scale + 4
      );
    });
  }, [cyclists, routePoints, totalLaps, currentTime, checkpointData, mapImage]);

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
      const pos = calculateCyclistPosition(athlete, cp);
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
const final = updated.map((cyclist) => {
  // Find T1 checkpoint finished time
  const t1Finished = cyclist.times?.find(t => t?.checkpoint.checkpoint_type.includes("t1"))?.actual_time;

  // Get all bike checkpoints
  const bikeCheckpoints = cyclist.times?.filter(t => t?.checkpoint.checkpoint_type.includes("bike"));
  
  // Get the last bike checkpoint
  const lastBikeCheckpoint = bikeCheckpoints?.slice(-1)[0];
  const lastCheckpointTime = lastBikeCheckpoint?.actual_time || null;

  // Calculate time since T1
  const timeSinceT1 = t1Finished && lastCheckpointTime
    ? formatTimeDiff(t1Finished, lastCheckpointTime)
    : null;

  // Calculate distance since T1
  const distanceSinceT1 = lastBikeCheckpoint?.checkpoint.distance_km
    ? lastBikeCheckpoint.checkpoint.distance_km * 1000
    : 0;

  return {
    ...cyclist,
    currentPosition: cyclist.hasStarted
      ? ranked.findIndex((c) => c.id === cyclist.id) + 1
      : 0,
    distanceSinceT1,
    timeSinceT1,
  };
});


    setCyclists(final);
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
          <CardTitle>
            Live Preview - Biking
            <span className="text-sm font-normal text-muted-foreground pl-2">
              Updated:{" "}
              {currentTime.toLocaleTimeString("en-GB", { hour12: false })}
            </span>
            {totalLaps > 1 && (
              <span className="text-sm font-normal text-muted-foreground">
                {" • "}
                {totalLaps} Laps - {(lapDistance / 1000).toFixed(1)}km per lap
              </span>
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
              {cyclists
                .sort((a, b) => a.currentPosition - b.currentPosition)
                .map((cyclist) => {
                  const total = template.bike_distance * 1000; // Total distance across all laps
                  const progress = (cyclist.distanceCovered / total) * 100;
                  const finished = progress >= 100;

                  const t1Finished = cyclist.times?.find(t => t?.checkpoint.checkpoint_type.includes("t1"))?.actual_time;
                  const filtered1 = cyclist.times?.filter(t => t?.checkpoint.checkpoint_type.includes("bike"));
                  const lastBikeCheckpoint = filtered1?.slice(-1)[0]
                  const lastcheckopinttime = lastBikeCheckpoint?.actual_time||null;
                  console.log(cyclist,"CYCLIST",t1Finished,lastcheckopinttime)
                  const timeSinceT1 = formatTimeDiff(t1Finished,lastcheckopinttime);
                  const distanceSinceT1 = lastBikeCheckpoint?.checkpoint.distance_km
                  console.log(timeSinceT1,distanceSinceT1)



return (
                    <Card
                      key={cyclist.id}
                      className={`${
                        finished
                          ? "ring-2 ring-green-500"
                          : cyclist.isActive
                          ? "ring-1 ring-blue-300"
                          : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center"
                            style={{ backgroundColor: cyclist.color }}
                          >
                            {cyclist.currentPosition || "—"}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{cyclist.name}</h3>
                            <div className="flex gap-2">
                              {finished && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  FINISHED
                                </span>
                              )}
                              {cyclist.isActive && !finished && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  CYCLING
                                </span>
                              )}
                              {!cyclist.hasStarted && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                  WAITING
                                </span>
                              )}
                              {cyclist.hasStarted && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  LAP {cyclist.currentLap}/{cyclist.totalLaps}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          {cyclist.hasStarted && (
                            <div className="flex justify-between">
                              <span>Okrążenie:</span>
                              <span className="font-mono">
                                {cyclist.currentLap} z {cyclist.totalLaps}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Dystans(+/-):</span>
                            <span className="font-mono">
                              {Math.round(cyclist.distanceCovered)}m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Progres:</span>
                            <span className="font-mono">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          {cyclist.hasStarted && (
                            <><div className="flex justify-between">
                              <span>Przewidziana prędkość:</span>
                              <span className="font-mono">
                                {calculateBikeSpeed(
                                  cyclist.predicted_bike_time,
                                  template.bike_distance
                                )}{" "}
                                km/h
                              </span>
                            </div>
                                                        <div className="flex justify-between">
                              <span>Średnia prędkość:</span>
                              <span className="font-mono">
                                {calculateBikeSpeed(
                                  timeSinceT1,
                                  distanceSinceT1
                                )}{" "}
                                km/h
                              </span>
                            </div></>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 h-3 rounded-full mt-3">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${Math.max(progress, 2)}%`,
                              backgroundColor: cyclist.color,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
            {cyclists.length === 0 && !isLoading && (
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
