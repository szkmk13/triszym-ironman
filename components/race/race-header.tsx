"use client";

import { Button } from "@/components/ui/button";
import { Athlete } from "@/lib/supabase-types";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface AthleteHeaderProps {
  template: Athlete;
  onBack: () => void;
}

export default function RaceHeader({
  template,
}: AthleteHeaderProps) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={() => router.push(`/`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Cofnij
      </Button>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          {template.name}
        </h1>
        <div className="flex items-center gap-2 text-gray-600">
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
