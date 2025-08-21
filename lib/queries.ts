import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase-utils";
import {
  Athlete,
  Template,
  TemplateCheckpoint,
  AthleteTime,
  SegmentRoutData,
} from "./supabase-types";
import { toast } from "sonner";

// Query Keys
export const queryKeys = {
  athletes: (templateId?: number) =>
    templateId !== undefined
      ? (["athletes", templateId] as const)
      : (["athletes"] as const),
  athlete: (id: number) => ["athlete", id] as const,
  templates: ["templates"] as const,
  template: (templateId: number) => ["template", templateId] as const,
  checkpoints: (templateId: number) => ["checkpoints", templateId] as const,
  athleteTimes: (athleteId: number) => ["athleteTimes", athleteId] as const,
  athleteTime: (checkpointId: number) => ["athleteTime", checkpointId] as const,
};

// Athletes Queries
export function useAthletes(templateId?: number) {
  return useQuery({
    queryKey: queryKeys.athletes(templateId),
    queryFn: async () => {
 const { data, error } = await supabase
        .from("athletes")
        .select(
          `
          *,
          times:athlete_times(
            *,
            checkpoint:template_checkpoints(*)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter if templateId is provided
      const filteredData = templateId
        ? data?.filter((athlete) => athlete.template_id === templateId)
        : data;

      return filteredData;
    },
  });
}

export function useAthlete(id: number) {
  return useQuery({
    queryKey: queryKeys.athlete(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select(
          `
          *,
          template:templates(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Athlete;
    },
    enabled: !!id,
  });
}

// Templates Queries
export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Template[];
    },
  });
}
export function useTemplate(templateId: number) {
  return useQuery({
    queryKey: queryKeys.template(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select(
          `
          *,
          checkpoints:template_checkpoints(*)
        `
        )
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
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
        .order("order_index");

      if (error) throw error;
      return data as TemplateCheckpoint[];
    },
    enabled: !!templateId,
  });
}

// Athlete Times Queries
export function useAthleteTimes(athleteId: number) {
  return useQuery({
    queryKey: queryKeys.athleteTimes(athleteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_times")
        .select("*")
        .eq("athlete_id", athleteId);

      if (error) throw error;
      return data as AthleteTime[];
    },
    enabled: !!athleteId,
  });
}
// Athlete Time Query
export function useAthleteTimeOnGivenCheckpoint(checkpointId: number) {
  return useQuery({
    queryKey: queryKeys.athleteTime(checkpointId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_times")
        .select("*")
        .eq("checkpoint_id", checkpointId);

      if (error) throw error;
      return data as AthleteTime[];
    },
    enabled: !!checkpointId,
  });
}

// Mutations
export function useCreateAthlete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (athlete: {
      name: string;
      template_id: number;
      predicted_swim_time: string | null;
      predicted_bike_time: string | null;
      predicted_run_time: string | null;
      predicted_t1_time: string | null;
      predicted_t2_time: string | null;
    }) => {
      const { data, error } = await supabase
        .from("athletes")
        .insert(athlete)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.athletes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

export function useRecordTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      athlete_id,
      checkpoint_id,
      actual_time,
    }: {
      athlete_id: number;
      checkpoint_id: number;
      actual_time: string;
    }) => {
      const { data, error } = await supabase
        .from("athlete_times")
        .upsert({
          athlete_id,
          checkpoint_id,
          actual_time,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate athlete times for this specific athlete
      queryClient.invalidateQueries({
        queryKey: queryKeys.athleteTimes(variables.athlete_id),
      });
      // Also invalidate the athletes list to update progress
      queryClient.invalidateQueries({ queryKey: queryKeys.athletes() });
      // Invalidate the specific athlete query
      queryClient.invalidateQueries({
        queryKey: queryKeys.athlete(variables.athlete_id),
      });
    },
  });
}
export function useEditAthleteTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      athlete_id,
      checkpoint_id, // Still needed for query invalidation
      actual_time,
    }: {
      checkpoint_id: number;
      athlete_id: number;
      actual_time: Date;
    }) => {
      const { data, error } = await supabase
        .from("athlete_times")
        .update({ actual_time: actual_time })
        .eq("athlete_id", athlete_id)
        .eq("checkpoint_id", checkpoint_id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.athleteTimes(variables.athlete_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.athletes() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.athlete(variables.athlete_id),
      });
    },
  });
}
export function useDeleteAthleteTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      athlete_time_id,
      athleteId,
    }: {
      athlete_time_id: number;
      athleteId: number;
    }) => {
      const { error } = await supabase
        .from("athlete_times")
        .delete()
        .eq("id", athlete_time_id);

      if (error) throw error;

      return { athlete_time_id, athleteId };
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.athleteTimes(variables.athleteId),
      });
    },
  });
}
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      name: string;
      swim_distance: number;
      bike_distance: number;
      run_distance: number;
    }) => {
      const { data, error } = await supabase
        .from("templates")
        .insert(template)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      toast.success("New template added");
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Template) => {
      const { data, error } = await supabase
        .from("templates")
        .update({
          name: template.name,
          swim_distance: template.swim_distance,
          bike_distance: template.bike_distance,
          run_distance: template.run_distance,
          swim_route_data: template.swim_route_data,
          bike_route_data: template.bike_route_data,
          run_route_data: template.run_route_data,
        })
        .eq("id", template.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.template(data.id)],
      });
    },
  });
}

export function useUpdateTemplateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (route: SegmentRoutData) => {
      // pobierz tylko ten fragment

      const segmentName = `${route.segmentType}_route_data`;
      const segmentMapName = `${route.segmentType}_map_url`;

      const { data: current, error: fetchError } = await supabase
        .from("templates")
        .select()
        .eq("id", route.templateId)
        .single();

      if (fetchError) throw fetchError;
      console.log(current);
      // weź obiekt spod klucza
      const segment = current[segmentName];

      // podmień points
      const updatedSegment = {
        ...segment,
        points: route.points,
      };
      const updatedMapUrl = route.segmentMapUrl?route.segmentMapUrl: current.segmentMapName

      // zapisz tylko ten klucz z powrotem do template
      const { data, error } = await supabase
        .from("templates")
        .update({
          [segmentName]: updatedSegment,
          [segmentMapName]: updatedMapUrl,
        })
        .eq("id", route.templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.template(data.id)],
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: number) => {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

export function useCreateCheckpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkpoint: {
      template_id: number;
      checkpoint_type: string;
      name: string;
      distance_km: number | null;
      order_index: number;
    }) => {
      const { data, error } = await supabase
        .from("template_checkpoints")
        .insert(checkpoint)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkpoints(data.template_id),
      });
    },
  });
}

export function useUpdateCheckpoint() {
  const queryClient = useQueryClient();

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
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkpoints(data.template_id),
      });
    },
  });
}

export function useDeleteCheckpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkpoint: TemplateCheckpoint) => {
      const { error } = await supabase
        .from("template_checkpoints")
        .delete()
        .eq("id", checkpoint.id);

      if (error) throw error;
      return { checkpoint };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.checkpoints(data.checkpoint.template_id),
      });
    },
  });
}
