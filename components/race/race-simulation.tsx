"use client";

import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Athlete, Template } from "@/lib/supabase";
import { useEffect, useState } from "react";

interface Swimmer {
  id: string;
  name: string;
  pace: number;
  startTime: Date;
  color: string;
}

interface SimulationTabProps {
  template: Template;
  athletes: Athlete[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  formatTime: (seconds: number) => string;
  swimStartCheckopintId:number;
}

export default function RaceSimulation({
  template,
  athletes,
  canvasRef,
  formatTime,
  swimStartCheckopintId,
}: SimulationTabProps) {

    useEffect(() => {
    let interval: NodeJS.Timeout;
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Live Preview - Swimming {swimStartCheckopintId}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold">
                Simulation Time: {formatTime(500)}
              </p>
              <p className="text-sm text-muted-foreground">
                Swimming Distance: {template.swim_distance}km
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="max-w-full h-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {athletes.map((swimmer, index) => {
                const swimmerCurrentTime = 2;
                const timeInMinutes = 600 / 60;
                const distanceSwum = (timeInMinutes / swimmer.predicted_swim_time) * 100;
                const swimDistance = template.swim_distance * 1000;
                const progress = Math.min(
                  100,
                  (distanceSwum / swimDistance) * 100
                );

                return (
                  <Card key={swimmer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: swimmer.color }}
                        >
                          {index + 1}
                        </div>
                        <h3 className="font-semibold">{swimmer.name}</h3>
                      </div>
                      <p className="text-sm">Pace: {swimmer.pace} min/100m</p>
                      <p className="text-sm">
                        Distance: {Math.round(distanceSwum)}m
                      </p>
                      <p className="text-sm">
                        Progress: {progress.toFixed(1)}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="h-2 rounded-full transition-all duration-1000"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: swimmer.color,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
