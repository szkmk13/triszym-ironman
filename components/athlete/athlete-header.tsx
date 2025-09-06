"use client";

import { Button } from "@/components/ui/button";
import { Athlete } from "@/lib/supabase-types";
import { ArrowLeft, Trophy, Clock, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface AthleteHeaderProps {
  athlete: Athlete;
  swimStartTimeString: string | undefined;
  onBack: () => void;
}

export default function AthleteHeader({
  athlete,
  swimStartTimeString,
}: AthleteHeaderProps) {
  const router = useRouter()
  return (
    <div>
      <div>
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.push(`/race/${athlete.template_id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Wyścig
          </Button>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8" />
            {athlete.name}
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-2 text-gray-600">
        <MapPin className="h-4 w-4" />
        <span>{athlete.template?.name}</span>
        {swimStartTimeString && (
          <>
            <span>•</span>
            <Clock className="h-4 w-4" />
            <span>
              Wystartował:{" "}
              {new Date(swimStartTimeString).toLocaleTimeString("en-GB", {
                hour12: false,
              })}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
