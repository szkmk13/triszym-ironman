"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useAthlete,
  useCheckpoints,
  useAthleteTimes,
  useRecordTime,
  useTemplate,
  useAthletes,
} from "@/lib/queries";
import PerformanceAnalysis from "@/components/athlete/performance-analysis";
import TimeRecorder from "@/components/athlete/time-recorder";
import CheckpointsList from "@/components/athlete/checkpoints-list";
import RaceHeader from "@/components/race/race-header";
import RaceSimulation from "@/components/race/race-simulation";
import { TemplateListItem } from "@/components/template-list-item";
import { AthleteListItem } from "@/components/athlete-list-item";

export default function RaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = Number.parseInt(params.id as string);
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  const { data: athletes = [], isLoading: athletesLoading } = useAthletes();
  const { data: template, isLoading: templateLoading } =
    useTemplate(templateId);
  console.log(template);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  if (templateLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading template data...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Athlete not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <RaceHeader template={template} onBack={() => router.back()} />

      <RaceSimulation
        template={template}
        swimmers={[]}
        canvasRef={canvasRef}
        formatTime={formatTime}
      />

      <Card>
        <CardHeader>
          <CardTitle>Race Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {athletes.map((athlete) => (
              <AthleteListItem key={athlete.id} athlete={athlete} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* <PerformanceAnalysis
        template={template}
        checkpoints={checkpoints}
        getCheckpointTime={getCheckpointTime}
        swimStartTime={swimStartTime}
      />

      <TimeRecorder
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        isRecording={recordTimeMutation.isPending}
      />

      <CheckpointsList
        checkpoints={checkpoints}
        template={template}
        getCheckpointTime={getCheckpointTime}
        swimStartTime={swimStartTime}
        currentTime={currentTime}
        onRecordTime={recordTime}
        isRecording={recordTimeMutation.isPending}
      /> */}
    </div>
  );
}
