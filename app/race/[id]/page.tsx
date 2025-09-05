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
  // this works for multiple racers

  const findIdByName = (items: TemplateCheckpoint[], targetName: string) => {
    const found = items.find((item) => item.checkpoint_type === targetName);
    return found ? found.id : 0;
  };

  const swimStartCheckpointId = findIdByName(checkpoints, "swim_start");
  // const bikeStartCheckpointId = findIdByName(checkpoints, "t1_finish");
  const runStartCheckpointId = findIdByName(checkpoints, "t2_finish");
  const haveAllAthletesReachedCheckpoint = (
    athletes: Athlete[],
    checkpointId: number
  ) => {
    return athletes.every((athlete) =>
      athlete.times?.some((time) => time.checkpoint_id === checkpointId)
    );
  };

  console.log(athletes[0].times[0])
const filtered = athletes[0].times.filter((t: { checkpoint: { checkpoint_type: string | string[]; }; }) => t?.checkpoint.checkpoint_type.includes("bike"));
const bikeStartCheckpointId = filtered[filtered.length - 1]?.checkpoint.id;


const t1Finished =
  athletes[0].times.find((t: { checkpoint: { checkpoint_type: string | string[]; }; }) => t?.checkpoint.checkpoint_type.includes("t1"))?.actual_time || null;

console.log(t1Finished)

  const swimPartIsFinished = haveAllAthletesReachedCheckpoint(
    athletes,
    bikeStartCheckpointId
  );
  const bikePartIsFinished = haveAllAthletesReachedCheckpoint(
    athletes,
    runStartCheckpointId
  );
//ironman specific function
//   console.log(athletes)
// const last = athletes[0].times[athletes[0].times.length - 1];
// console.log(last.checkpoint.id);
// const bikeStartCheckpointId = last.checkpoint.id
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
            // currentBikeCheckpoint={currentBikeCheckpoint}
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
