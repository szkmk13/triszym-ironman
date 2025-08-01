"use client";

import { AthleteForm } from "@/components/athlete-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock } from "lucide-react";
import Navbar from "@/components/navbar";
import { useAthletes, useTemplates } from "@/lib/queries";
import { TemplateListItem } from "@/components/template-list-item";

export default function TriathlonCalculator() {
  const { data: athletes = [], isLoading: athletesLoading } = useAthletes();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Navbar />

      <Tabs defaultValue="tracker" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Race Tracker
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Athletes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="space-y-6">
          {templatesLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Loading races...</div>
              </CardContent>
            </Card>
          ) : athletes.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <Users className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="text-lg font-semibold">No Athletes Added</h3>
                  <p className="text-gray-600">
                    Add athletes in the &quot;Manage Athletes&quot; tab to start
                    tracking
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Race Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {templates.map((athlete) => (
                    <TemplateListItem key={athlete.id} template={athlete} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <AthleteForm />
          {!athletesLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Registered Athletes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {athletes.map((athlete) => (
                    <div
                      key={athlete.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{athlete.name}</div>
                        <div className="text-sm text-gray-500">
                          Template: {athlete.template?.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
