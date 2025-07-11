"use client"

import { useState, useEffect } from "react"
import { AthleteForm } from "@/components/athlete-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { supabase, type Athlete } from "@/lib/supabase"
import { toast } from "sonner"
import { Users, Trophy, Clock, Settings } from "lucide-react"
import { AthleteListItem } from "@/components/athlete-list-item"
import Link from "next/link"

export default function TriathlonCalculator() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAthletes()
  }, [])

  const fetchAthletes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("athletes")
      .select(`
        *,
        template:templates(*)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch athletes",
        variant: "destructive",
      })
    } else {
      setAthletes(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
            <Trophy className="h-8 w-8" />
            Triathlon Calculator
          </h1>
          <p className="text-gray-600">Track your athletes' progress during triathlon races</p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Admin
          </Button>
        </Link>
      </div>

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
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Loading athletes...</div>
              </CardContent>
            </Card>
          ) : athletes.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <Users className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="text-lg font-semibold">No Athletes Added</h3>
                  <p className="text-gray-600">Add athletes in the "Manage Athletes" tab to start tracking</p>
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
                  {athletes.map((athlete) => (
                    <AthleteListItem key={athlete.id} athlete={athlete} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <AthleteForm onAthleteAdded={fetchAthletes} />

          {athletes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Registered Athletes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {athletes.map((athlete) => (
                    <div key={athlete.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{athlete.name}</div>
                        <div className="text-sm text-gray-500">Template: {athlete.template?.name}</div>
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
  )
}
