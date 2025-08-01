"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckpointForm } from "@/components/admin/checkpoint-form";
import { CheckpointItem } from "@/components/admin/checkpoint-item";
import type { TemplateCheckpoint } from "@/lib/supabase-types";
import type React from "react";

interface CheckpointsTabProps {
  templateId: number;
  checkpoints: TemplateCheckpoint[];
}

export function CheckpointsTab({
  templateId,
  checkpoints,
}: CheckpointsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Checkpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {checkpoints.map((checkpoint) => (
              <CheckpointItem key={checkpoint.id} checkpoint={checkpoint} />
            ))}
            {checkpoints.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No checkpoints defined for this template
                </p>
              </div>
            )}
          </div>

          <CheckpointForm templateId={templateId} checkpoints={checkpoints} />
        </CardContent>
      </Card>
    </div>
  );
}
