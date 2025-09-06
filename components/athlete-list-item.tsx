"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Clock, Trophy, MapPin } from "lucide-react";
import Link from "next/link";
import { Athlete } from "@/lib/supabase-types";
import { useAthleteTimes, useCheckpoints } from "@/lib/queries";

interface AthleteListItemProps {
  athlete: Athlete;
}

export function AthleteListItem({ athlete }: AthleteListItemProps) {
  const { data: checkpoints = [] } = useCheckpoints(athlete.template_id);
  const { data: athleteTimes = [] } = useAthleteTimes(athlete.id);

  const getCompletionStats = () => {
    const totalCheckpoints = checkpoints.length;
    const completedCheckpoints = athleteTimes.length;
    return { total: totalCheckpoints, completed: completedCheckpoints };
  };

  const getCurrentStatus = () => {
    if (athleteTimes.length === 0) return "Not Started";
    if (athleteTimes.length === checkpoints.length) return "Finished";

    const lastCompletedCheckpoint = checkpoints.find((cp) =>
      athleteTimes.some((at) => at.checkpoint_id === cp.id)
    );

    return lastCompletedCheckpoint?.name || "In Progress";
  };

  const getStatusColor = () => {
    const status = getCurrentStatus();
    if (status === "Finished") return "bg-green-100 text-green-800";
    if (status === "Not Started") return "bg-gray-100 text-gray-800";
    return "bg-blue-100 text-blue-800";
  };

  const getSwimStartTime = () => {
    const swimStartCheckpoint = checkpoints.find(
      (cp) => cp.checkpoint_type === "swim_start"
    );
    return swimStartCheckpoint
      ? athleteTimes.find((at) => at.checkpoint_id === swimStartCheckpoint.id)
      : null;
  };

  const stats = getCompletionStats();
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const swimStartTime = getSwimStartTime();

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1 space-y-2 w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">{athlete.name}</span>
          </div>
          <Badge className={getStatusColor()}>{getCurrentStatus()}</Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{athlete.template?.name}</span>
          </div>
          {swimStartTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(swimStartTime.actual_time).toLocaleTimeString(
                  "en-GB",
                  {
                    hour12: false,
                  }
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 min-w-fit">
            {stats.completed}/{stats.total}
          </span>
        </div>

        {/* Button goes below progress bar on mobile */}
        <div className="mt-3 md:hidden">
          <Link href={`/athlete/${athlete.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              SZCZEGÓŁOWE WYNIKI
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Desktop version (still on the right) */}
      <div className="hidden md:block ml-4">
        <Link href={`/athlete/${athlete.id}`}>
          <Button variant="outline" size="sm">
            KLIKNIJ TUTAJ ABY ZOBACZYĆ SZCZEGÓŁOWE WYNIKI
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
