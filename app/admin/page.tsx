"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Edit, Trash2, MapPin, CheckCircle, ArrowLeft } from "lucide-react";
import { TemplateForm } from "@/components/admin/template-form";
import Link from "next/link";
import { Template } from "@/lib/supabase-types";
import { useDeleteTemplate, useTemplates } from "@/lib/queries";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const getSegmentStatus = (template: Template) => {
    const segments = [
      {
        name: "Swim",
        hasMap: !!template.swim_map_url,
        hasRoute: !!template.swim_route_data,
      },
      {
        name: "Bike",
        hasMap: !!template.bike_map_url,
        hasRoute: !!template.bike_route_data,
      },
      {
        name: "Run",
        hasMap: !!template.run_map_url,
        hasRoute: !!template.run_route_data,
      },
    ];

    const configured = segments.filter((s) => s.hasMap && s.hasRoute).length;
    return { segments, configured, total: segments.length };
  };

  const mutateDeleteTemplate = useDeleteTemplate();
  const handleDelete = async (templateId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this template? This will also delete all associated checkpoints and athlete data."
      )
    ) {
      return;
    }
    await mutateDeleteTemplate.mutateAsync(templateId);
  };
    const router = useRouter()
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => router.push(`/`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Cofnij
      </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Template Administration
        </h1>
      </div>

      <TemplateForm />

      <Card>
        <CardHeader>
          <CardTitle>Existing Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <>
              <p className="text-center text-muted-foreground py-8">
                Loading templates...
              </p>
            </>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const segmentStatus = getSegmentStatus(template);
                return (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                          {template.name}
                        </h3>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Swim: {template.swim_distance}km</span>
                          <span>Bike: {template.bike_distance}km</span>
                          <span>Run: {template.run_distance}km</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span>
                              Routes: {segmentStatus.configured}/
                              {segmentStatus.total} configured
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {segmentStatus.segments.map((segment, index) => (
                              <div
                                key={index}
                                className={`text-xs px-2 py-1 rounded ${
                                  segment.hasMap && segment.hasRoute
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {segment.name}
                                {segment.hasMap && segment.hasRoute && (
                                  <CheckCircle className="inline h-3 w-3 ml-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/admin/template/${template.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit & Map
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(template.id)}
                          disabled={mutateDeleteTemplate.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {templates.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No templates found. Create your first template above.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
