"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useParams, useRouter } from "next/navigation";
import {
  useTemplate,
  useAthletes,
} from "@/lib/queries";
import RaceHeader from "@/components/race/race-header";
import RaceSimulation from "@/components/race/race-simulation";
import { AthleteListItem } from "@/components/athlete-list-item";

export default function RaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = Number.parseInt(params.id as string);
  const { data: athletes = [], isLoading: athletesLoading } = useAthletes(templateId);
  const { data: template, isLoading: templateLoading } =  useTemplate(templateId);
  // console.log(template);
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
  const swimStartCheckpointId = template.swim_checkpoint?.[0]?.id 
  console.log(template,swimStartCheckpointId)
  return (
    <div className="container mx-auto p-6 space-y-6">
      <RaceHeader template={template} onBack={() => router.back()} />
      
      <Card>
        <CardHeader>
          <CardTitle>Athlete Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {athletes.map((athlete) => (
              <AthleteListItem key={athlete.id} athlete={athlete} />
            ))}
          </div>
        </CardContent>
      </Card>
      
      <RaceSimulation
        template={template}
        athletes={athletes}
        swimStartCheckpointId={swimStartCheckpointId}
      />



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
