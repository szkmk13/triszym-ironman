"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { calculateSwimPace } from "@/lib/supabase-utils"; // Add this import
import { useAthleteTimeOnGivenCheckpoint } from "@/lib/queries"; // Add this import
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
  mapImageUrl?: string;
  routePoints?: RoutePoint[];
}

export default function RaceSimulation({
  template,
  athletes,
  swimStartCheckpointId,
}: SimulationTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  // At the top of the component, add these fallback values
  const routePoints = template?.swim_route_data?.points || [];
  const mapImageUrl =
    template?.swim_map_url ||
    "/placeholder.svg?height=600&width=800&text=Swimming+Route+Map";

  // Use the custom hook to fetch athlete times for the checkpoint
  const {
    data: athleteCheckpointData,
    isLoading,
    error,
  } = useAthleteTimeOnGivenCheckpoint(swimStartCheckpointId);

  // Load map image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setMapImage(img);
    };
    img.src = mapImageUrl;
  }, [mapImageUrl]);
  function durationToSeconds(duration: string): number {
    const [hours, minutes, seconds] = duration.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  // Update current time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate swimmer current position and distance
  const calculateSwimmerPosition = (
    athlete: Athlete,
    checkpointData: AthleteTime | undefined
  ) => {
    console.log(`Calculating position for ${athlete.name}:`, {
      checkpointData,
      hasActualTime: !!checkpointData?.actual_time,
    });

    if (!checkpointData?.actual_time) {
      return {
        currentPosition: 0,
        distanceSwum: 0,
        isActive: false,
        hasStarted: false,
      };
    }

    const startTime = new Date(checkpointData.actual_time);
    const hasStarted = currentTime >= startTime;

    console.log(`Time comparison for ${athlete.name}:`, {
      startTime: startTime.toISOString(),
      currentTime: currentTime.toISOString(),
      hasStarted,
      timeDifferenceMs: currentTime.getTime() - startTime.getTime(),
    });

    if (!hasStarted) {
      return {
        currentPosition: 0,
        distanceSwum: 0,
        isActive: false,
        hasStarted: false,
      };
    }

    // Time swimming in seconds since start
    const timeSwimmingSeconds =
      (currentTime.getTime() - startTime.getTime()) / 1000;

    // Calculate distance based on athlete's predicted pace
    const totalSwimTimeSeconds = durationToSeconds(athlete.predicted_swim_time);
    const totalSwimDistance = template.swim_distance * 1000; // Convert km to meters

    // Current distance swum based on time elapsed and predicted pace
    const distanceSwum = Math.min(
      totalSwimDistance,
      (timeSwimmingSeconds / totalSwimTimeSeconds) * totalSwimDistance
    );

    const isActive = distanceSwum < totalSwimDistance && distanceSwum > 0;

    console.log(`Distance calculation for ${athlete.name}:`, {
      timeSwimmingSeconds,
      totalSwimTimeSeconds,
      totalSwimDistance,
      distanceSwum,
      isActive,
      progress: (distanceSwum / totalSwimDistance) * 100,
    });

    return {
      currentPosition: 0, // Will be calculated after all swimmers are processed
      distanceSwum: Math.max(0, distanceSwum),
      isActive,
      hasStarted: true,
    };
  };

  // Calculate swimmer position on route for canvas drawing
  const calculateSwimmerCanvasPosition = (
    swimmer: Swimmer,
    routePoints: RoutePoint[]
  ) => {
    if (!swimmer.hasStarted || !routePoints || routePoints.length < 2) {
      return routePoints?.[0] || { x: 0, y: 0 };
    }

    const totalDistance = template.swim_distance * 1000;
    const progress = Math.min(swimmer.distanceSwum / totalDistance, 1);

    // Calculate position along the route based on progress
    const totalRouteLength = routePoints.length - 1;
    const segmentIndex = Math.floor(progress * totalRouteLength);
    const segmentProgress = progress * totalRouteLength - segmentIndex;

    const currentPoint =
      routePoints[segmentIndex] || routePoints[routePoints.length - 1];
    const nextPoint = routePoints[segmentIndex + 1] || currentPoint;

    // Interpolate between current and next point
    const x = currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress;
    const y = currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress;

    return { x, y };
  };

  // Canvas drawing effect
  useEffect(() => {
    if (
      !canvasRef.current ||
      !mapImage ||
      !routePoints ||
      routePoints.length === 0
    )
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const maxWidth = 800;
    const maxHeight = 600;
    const scale = Math.min(
      maxWidth / mapImage.width,
      maxHeight / mapImage.height,
      1
    );

    canvas.width = mapImage.width * scale;
    canvas.height = mapImage.height * scale;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    // Draw route
    if (routePoints.length > 1) {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(routePoints[0].x * scale, routePoints[0].y * scale);

      routePoints.forEach((point) => {
        ctx.lineTo(point.x * scale, point.y * scale);
      });
      ctx.stroke();

      // Draw start and finish markers
      const startPoint = routePoints[0];
      const finishPoint = routePoints[routePoints.length - 1];

      // Start marker (green circle)
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(startPoint.x * scale, startPoint.y * scale, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("S", startPoint.x * scale, startPoint.y * scale + 4);

      // Finish marker (red circle)
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.arc(finishPoint.x * scale, finishPoint.y * scale, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText("F", finishPoint.x * scale, finishPoint.y * scale + 4);
    }

    // Draw swimmers
    swimmers.forEach((swimmer) => {
      if (!swimmer.hasStarted) return;

      const position = calculateSwimmerCanvasPosition(swimmer, routePoints);

      // Draw swimmer dot
      ctx.fillStyle = swimmer.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(position.x * scale, position.y * scale, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw swimmer number
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        swimmer.currentPosition.toString(),
        position.x * scale,
        position.y * scale + 4
      );

      // Draw swimmer name above
      ctx.fillStyle = swimmer.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.font = "bold 14px Arial";
      ctx.strokeText(
        swimmer.name,
        position.x * scale,
        (position.y - 20) * scale
      );
      ctx.fillText(swimmer.name, position.x * scale, (position.y - 20) * scale);
    });
  }, [mapImage, swimmers, routePoints, currentTime]);

  //   Set up swimmers with positions and colors
  useEffect(() => {
    if (athleteCheckpointData && athletes.length > 0) {
      const colors = [
        "#3B82F6",
        "#EF4444",
        "#10B981",
        "#F59E0B",
        "#8B5CF6",
        "#EC4899",
      ];

      // Calculate each swimmer's data
      const swimmersWithData = athletes.map((athlete, index) => {
        // Convert athlete.id to number for comparison
        const athleteCheckpoint = athleteCheckpointData.find(
          (checkpoint) => checkpoint.athlete_id === Number(athlete.id)
        );

        console.log(`Athlete ${athlete.name} (ID: ${athlete.id}):`, {
          athleteCheckpoint,
          foundMatch: !!athleteCheckpoint,
          actualTime: athleteCheckpoint?.actual_time,
          currentTime: currentTime.toISOString(),
        });

        const positionData = calculateSwimmerPosition(
          athlete,
          athleteCheckpoint
        );

        console.log(`Position data for ${athlete.name}:`, positionData);

        return {
          ...athlete,
          startTime: athleteCheckpoint?.actual_time
            ? new Date(athleteCheckpoint.actual_time)
            : undefined,
          color: colors[index % colors.length],
          ...positionData,
        };
      });

      console.log("Swimmers with data:", swimmersWithData);

      // Sort by distance to determine positions (furthest distance = 1st place)
      const sortedByDistance = [...swimmersWithData].sort(
        (a, b) => b.distanceSwum - a.distanceSwum
      );

      // Assign positions
      const swimmersWithPositions = swimmersWithData.map((swimmer) => {
        const position =
          sortedByDistance.findIndex((s) => s.id === swimmer.id) + 1;
        return {
          ...swimmer,
          currentPosition: swimmer.hasStarted ? position : 0,
        };
      });

      setSwimmers(swimmersWithPositions);
    }
  }, [athleteCheckpointData, athletes, currentTime, routePoints, template]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Loading race simulation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600">
              Error loading race data: {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Live Preview - Swimming Checkpoint {swimStartCheckpointId}
            <span className="text-sm font-normal text-muted-foreground">
              Updated: {currentTime.toLocaleTimeString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <canvas ref={canvasRef} className="max-w-full h-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {swimmers
                .sort(
                  (a, b) =>
                    a.currentPosition - b.currentPosition ||
                    b.distanceSwum - a.distanceSwum
                )
                .map((swimmer) => {
                  const totalDistance = template.swim_distance * 1000;
                  const progress = (swimmer.distanceSwum / totalDistance) * 100;
                  const isFinished = progress >= 100;

                  return (
                    <Card
                      key={swimmer.id}
                      className={`${
                        isFinished ? "ring-2 ring-green-500" : ""
                      } ${swimmer.isActive ? "ring-1 ring-blue-300" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: swimmer.color }}
                          >
                            {swimmer.currentPosition || "—"}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{swimmer.name}</h3>
                            <div className="flex gap-2 items-center">
                              {isFinished && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  FINISHED
                                </span>
                              )}
                              {swimmer.isActive && !isFinished && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  SWIMMING
                                </span>
                              )}
                              {!swimmer.hasStarted && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                  WAITING
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Distance:</span>
                            <span className="font-mono">
                              {Math.round(swimmer.distanceSwum)}m
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Progress:</span>
                            <span className="font-mono">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          {swimmer.hasStarted && (
                            <div className="flex justify-between text-sm">
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
                            className="h-3 rounded-full transition-all duration-1000 flex items-center justify-end pr-1"
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
                })}
            </div>

            {swimmers.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No athlete data found for this checkpoint.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
