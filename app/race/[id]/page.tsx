"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useParams, useRouter } from "next/navigation";
import { useTemplate, useAthletes } from "@/lib/queries";
import RaceHeader from "@/components/race/race-header";
import SwimSimulation from "@/components/race/swim-simulation";
import { AthleteListItem } from "@/components/athlete-list-item";
import BikeSimulation from "@/components/race/bike-simulation";
import { Athlete, TemplateCheckpoint } from "@/lib/supabase-types";
import RunSimulation from "@/components/race/run-simulation";

export default function RaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = Number.parseInt(params.id as string);
  const { data: athletes = [], isLoading: athletesLoading } =
    useAthletes(templateId);
  const { data: template, isLoading: templateLoading } =
    useTemplate(templateId);
  if (templateLoading || athletesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading race data...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Race not found</div>
      </div>
    );
  }
  const checkpoints = template.checkpoints;

  const findIdByName = (items: TemplateCheckpoint[], targetName: string) => {
    const found = items.find((item) => item.checkpoint_type === targetName);
    return found ? found.id : 0;
  };

  const swimStartCheckpointId = findIdByName(checkpoints, "swim_start");
  const bikeStartCheckpointId = findIdByName(checkpoints, "t1_finish");
  const runStartCheckpointId = findIdByName(checkpoints, "t2_finish");

  const haveAllAthletesReachedCheckpoint = (
    athletes: Athlete[],
    checkpointId: number
  ) => {
    return athletes.every((athlete) =>
      athlete.times?.some((time) => time.checkpoint_id === checkpointId)
    );
  };

  const swimPartIsFinished = haveAllAthletesReachedCheckpoint(
    athletes,
    bikeStartCheckpointId
  );
  const bikePartIsFinished = haveAllAthletesReachedCheckpoint(
    athletes,
    runStartCheckpointId
  );

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
      {swimPartIsFinished ? (
        <> </>
      ) : (
        <SwimSimulation
          template={template}
          athletes={athletes}
          swimStartCheckpointId={swimStartCheckpointId}
        />
      )}
      {bikePartIsFinished ? (
        <></>
      ) : (
        <>
          <BikeSimulation
            template={template}
            athletes={athletes}
            bikeStartCheckpointId={bikeStartCheckpointId}
          />
        </>
      )}
      <RunSimulation
        template={template}
        athletes={athletes}
        runStartCheckpointId={runStartCheckpointId}
      />
    </div>
  );
}
