"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Bike, Footprints, GlassWater } from "lucide-react";
import Link from "next/link";
import { Template } from "@/lib/supabase-types";
import { useCheckpoints } from "@/lib/queries";

interface TemplateListItemProps {
  template: Template;
}

export function TemplateListItem({ template }: TemplateListItemProps) {
  const totalDistance =
    template.swim_distance + template.bike_distance + template.run_distance;
  const hasMapData =
    template.swim_map_url || template.bike_map_url || template.run_map_url;
  const { data: checkpoints = [] } = useCheckpoints(template.id);

  console.log(template);
  return (
    <div className="flex flex-col gap-3 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{template.name}</span>
          <Badge className="bg-gray-100 text-gray-800">
            {checkpoints.length} Checkpoints
          </Badge>
        </div>
        <Link href={`/template/${template.id}`}>
          <Button variant="ghost" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <GlassWater className="h-4 w-4 text-blue-500" />
          <span>{template.swim_distance} m</span>
        </div>
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-yellow-500" />
          <span>{template.bike_distance} km</span>
        </div>
        <div className="flex items-center gap-2">
          <Footprints className="h-4 w-4 text-green-500" />
          <span>{template.run_distance} km</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
        <span>
          Total distance: <strong>{totalDistance} km</strong>
        </span>
        {hasMapData && <span className="italic text-blue-600">With maps</span>}
      </div>
    </div>
  );
}
