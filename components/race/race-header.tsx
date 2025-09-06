"use client";

import { Button } from "@/components/ui/button";
import { Athlete } from "@/lib/supabase-types";
import { ArrowLeft, Trophy, MapPin } from "lucide-react";

interface AthleteHeaderProps {
  template: Athlete;
  onBack: () => void;
}

export default function RaceHeader({
  template,
  onBack,
}: AthleteHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Cofnij
      </Button>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8" />
          {template.name}
        </h1>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{template.template?.name}</span>
          {/* {swimStartTime && (
            <>
              <span>•</span>
              <Clock className="h-4 w-4" />
              <span>
                Started:{" "}
                {new Date(swimStartTime.actual_time).toLocaleTimeString(
                  "en-GB",
                  { hour12: false }
                )}
              </span>
            </>
          )} */}
        </div>
      </div>
    </div>
  );
}
