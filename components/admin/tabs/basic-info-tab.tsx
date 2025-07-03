"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Template } from "@/lib/supabase"

interface BasicInfoTabProps {
  template: Template
  onUpdateTemplate: (template: Template) => void
}

export function BasicInfoTab({ template, onUpdateTemplate }: BasicInfoTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={template.name}
                onChange={(e) => onUpdateTemplate({ ...template, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="swim">Swim Distance (km)</Label>
              <Input
                id="swim"
                type="number"
                step="0.1"
                value={template.swim_distance}
                onChange={(e) => onUpdateTemplate({ ...template, swim_distance: Number.parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="bike">Bike Distance (km)</Label>
              <Input
                id="bike"
                type="number"
                step="0.1"
                value={template.bike_distance}
                onChange={(e) => onUpdateTemplate({ ...template, bike_distance: Number.parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="run">Run Distance (km)</Label>
              <Input
                id="run"
                type="number"
                step="0.1"
                value={template.run_distance}
                onChange={(e) => onUpdateTemplate({ ...template, run_distance: Number.parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
