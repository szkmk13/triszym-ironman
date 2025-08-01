"use client";

import { Button } from "@/components/ui/button";
import { Athlete, } from "@/lib/supabase-types";
import { ArrowLeft, Trophy, Clock, MapPin } from "lucide-react";

interface AthleteHeaderProps {
  athlete: Athlete;
  swimStartTimeString: string|undefined;
  onBack: () => void;
}

export default function AthleteHeader({
  athlete,
  swimStartTimeString,
  onBack,
}: AthleteHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8" />
          {athlete.name}
        </h1>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{athlete.template?.name}</span>
          {swimStartTimeString && (
            <>
              <span>•</span>
              <Clock className="h-4 w-4" />
              <span>
                Started:{" "}
                {new Date(swimStartTimeString).toLocaleTimeString(
                  "en-GB",
                  { hour12: false }
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
