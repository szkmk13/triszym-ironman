import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, type Athlete, type Template, type TemplateCheckpoint, type AthleteTime } from "./supabase"

// Query Keys
export const queryKeys = {
  athletes: ["athletes"] as const,
  athlete: (id: number) => ["athlete", id] as const,
  templates: ["templates"] as const,
  checkpoints: (templateId: number) => ["checkpoints", templateId] as const,
  athleteTimes: (athleteId: number) => ["athleteTimes", athleteId] as const,
}

// Athletes Queries
export function useAthletes() {
  return useQuery({
    queryKey: queryKeys.athletes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(`
          *,
          template:templates(*)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data as Athlete[]
    },
  })
}

export function useAthlete(id: number) {
  return useQuery({
    queryKey: queryKeys.athlete(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(`
          *,
          template:templates(*)
        `)
        .eq("id", id)
        .single()

      if (error) throw error
      return data as Athlete
    },
    enabled: !!id,
  })
}

// Templates Queries
export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").order("name")

      if (error) throw error
      return data as Template[]
    },
  })
}

// Checkpoints Queries
export function useCheckpoints(templateId: number) {
  return useQuery({
    queryKey: queryKeys.checkpoints(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_checkpoints")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index")

      if (error) throw error
      return data as TemplateCheckpoint[]
    },
    enabled: !!templateId,
  })
}

// Athlete Times Queries
export function useAthleteTimes(athleteId: number) {
  return useQuery({
    queryKey: queryKeys.athleteTimes(athleteId),
    queryFn: async () => {
      const { data, error } = await supabase.from("athlete_times").select("*").eq("athlete_id", athleteId)

      if (error) throw error
      return data as AthleteTime[]
    },
    enabled: !!athleteId,
  })
}

// Mutations
export function useCreateAthlete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (athlete: {
      name: string
      template_id: number
      predicted_swim_time: string | null
      predicted_bike_time: string | null
      predicted_run_time: string | null
      predicted_t1_time: string | null
      predicted_t2_time: string | null
    }) => {
      const { data, error } = await supabase.from("athletes").insert(athlete).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.athletes })
      queryClient.invalidateQueries({ queryKey: queryKeys.templates })
    },
  })
}

export function useRecordTime() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      athlete_id,
      checkpoint_id,
      actual_time,
    }: {
      athlete_id: number
      checkpoint_id: number
      actual_time: string
    }) => {
      const { data, error } = await supabase
        .from("athlete_times")
        .upsert({
          athlete_id,
          checkpoint_id,
          actual_time,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate athlete times for this specific athlete
      queryClient.invalidateQueries({ queryKey: queryKeys.athleteTimes(variables.athlete_id) })
      // Also invalidate the athletes list to update progress
      queryClient.invalidateQueries({ queryKey: queryKeys.athletes })
      // Invalidate the specific athlete query
      queryClient.invalidateQueries({ queryKey: queryKeys.athlete(variables.athlete_id) })
    },
  })
}
export function useEditAthleteTime() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      athlete_id, // Still needed for query invalidation
    }: {
      id: number
      athlete_id: number
      updates: {
        athlete_id?: number
        checkpoint_id?: number
        actual_time?: string
      }
    }) => {
      console.log(updates)
      const { data, error } = await supabase
        .from("athlete_times")
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.athleteTimes(variables.athlete_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.athletes })
      queryClient.invalidateQueries({ queryKey: queryKeys.athlete(variables.athlete_id) })
    },
  })
}
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (template: {
      name: string
      swim_distance: number
      bike_distance: number
      run_distance: number
    }) => {
      const { data, error } = await supabase.from("templates").insert(template).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (template: Template) => {
      const { data, error } = await supabase
        .from("templates")
        .update({
          name: template.name,
          swim_distance: template.swim_distance,
          bike_distance: template.bike_distance,
          run_distance: template.run_distance,
        })
        .eq("id", template.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: number) => {
      const { error } = await supabase.from("templates").delete().eq("id", templateId)

      if (error) throw error
      return templateId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates })
    },
  })
}

export function useCreateCheckpoint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (checkpoint: {
      template_id: number
      checkpoint_type: string
      name: string
      distance_km: number | null
      order_index: number
    }) => {
      const { data, error } = await supabase.from("template_checkpoints").insert(checkpoint).select().single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkpoints(data.template_id) })
    },
  })
}

export function useUpdateCheckpoint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (checkpoint: TemplateCheckpoint) => {
      const { data, error } = await supabase
        .from("template_checkpoints")
        .update({
          checkpoint_type: checkpoint.checkpoint_type,
          name: checkpoint.name,
          distance_km: checkpoint.distance_km,
          order_index: checkpoint.order_index,
        })
        .eq("id", checkpoint.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkpoints(data.template_id) })
    },
  })
}

export function useDeleteCheckpoint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ checkpointId, templateId }: { checkpointId: number; templateId: number }) => {
      const { error } = await supabase.from("template_checkpoints").delete().eq("id", checkpointId)

      if (error) throw error
      return { checkpointId, templateId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkpoints(data.templateId) })
    },
  })
}
