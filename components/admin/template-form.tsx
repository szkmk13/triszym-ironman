"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useCreateTemplate } from "@/lib/queries";

export function TemplateForm() {
  const mutateCreateTemplate = useCreateTemplate();
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    swim_distance: 1.9,
    bike_distance: 90,
    run_distance: 21.0975,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutateCreateTemplate.mutateAsync(newTemplate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Template
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="swimDistance">Swim Distance (km)</Label>
              <Input
                id="swimDistance"
                type="number"
                step="0.1"
                value={newTemplate.swim_distance}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    swim_distance: Number.parseFloat(e.target.value),
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="bikeDistance">Bike Distance (km)</Label>
              <Input
                id="bikeDistance"
                type="number"
                step="0.1"
                value={newTemplate.bike_distance}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    bike_distance: Number.parseFloat(e.target.value),
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="runDistance">Run Distance (km)</Label>
              <Input
                id="runDistance"
                type="number"
                step="0.1"
                value={newTemplate.run_distance}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    run_distance: Number.parseFloat(e.target.value),
                  })
                }
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={mutateCreateTemplate.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
