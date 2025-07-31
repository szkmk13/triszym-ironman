"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, Edit2, Save, X, Trash2 } from "lucide-react";
import {
  calculateElapsedTime,
  calculateCheckpointPace,
  TemplateCheckpoint,
  Athlete,
  AthleteTime,
} from "@/lib/supabase-utils";
import { useDeleteAthleteTime, useEditAthleteTime } from "@/lib/queries";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface CheckpointItemProps {
  checkpoint: TemplateCheckpoint;
  athlete: Athlete;
  checkpoints: TemplateCheckpoint[];
  getCheckpointTime: (id: number) => AthleteTime;
  swimStartTime: AthleteTime;
  currentTime: string;
  onRecordTime: (checkpointId: number, timeString?: string) => void;
  isRecording: boolean;
}

export default function CheckpointItem({
  checkpoint,
  athlete,
  checkpoints,
  getCheckpointTime,
  swimStartTime,
  currentTime,
  onRecordTime,
  isRecording,
}: CheckpointItemProps) {
  console.log(athlete);
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const editAthleteTimeMutation = useEditAthleteTime();
  const useDeleteAthleteTimeMutation = useDeleteAthleteTime();
  const time = getCheckpointTime(checkpoint.id);
  const isCompleted = !!time;
  const elapsedTime = time
    ? calculateElapsedTime(swimStartTime?.actual_time, time.actual_time)
    : "--:--:--";

  const getCheckpointColor = (checkpoint: TemplateCheckpoint) => {
    const time = getCheckpointTime(checkpoint.id);
    if (time) return "bg-green-100 text-green-800";
    switch (checkpoint.checkpoint_type) {
      case "swim_start":
      case "swim_finish":
        return "bg-blue-100 text-blue-800";
      case "t1_finish":
      case "t2_finish":
        return "bg-yellow-100 text-yellow-800";
      case "bike_checkpoint":
        return "bg-orange-100 text-orange-800";
      case "run_checkpoint":
      case "finish":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLastCheckpointForSegment = (
    checkpointType: string,
    currentCheckpoint: TemplateCheckpoint
  ) => {
    if (checkpointType === "swim_finish") {
      const swimStartCheckpoint = checkpoints.find(
        (cp) => cp.checkpoint_type === "swim_start"
      );
      return swimStartCheckpoint
        ? getCheckpointTime(swimStartCheckpoint.id)
        : null;
    }

    if (checkpointType === "bike_checkpoint") {
      const bikeCheckpoints = checkpoints
        .filter(
          (cp) =>
            cp.checkpoint_type === "bike_checkpoint" ||
            cp.checkpoint_type === "t1_finish"
        )
        .sort((a, b) => a.order_index - b.order_index);

      const currentIndex = bikeCheckpoints.findIndex(
        (cp) => cp.id === currentCheckpoint.id
      );
      if (currentIndex > 0) {
        return getCheckpointTime(bikeCheckpoints[currentIndex - 1].id);
      } else {
        const t1FinishCheckpoint = checkpoints.find(
          (cp) => cp.checkpoint_type === "t1_finish"
        );
        return t1FinishCheckpoint
          ? getCheckpointTime(t1FinishCheckpoint.id)
          : null;
      }
    }

    if (checkpointType === "run_checkpoint" || checkpointType === "finish") {
      const runCheckpoints = checkpoints
        .filter(
          (cp) =>
            cp.checkpoint_type === "run_checkpoint" ||
            cp.checkpoint_type === "t2_finish" ||
            cp.checkpoint_type === "finish"
        )
        .sort((a, b) => a.order_index - b.order_index);

      const currentIndex = runCheckpoints.findIndex(
        (cp) => cp.id === currentCheckpoint.id
      );
      if (currentIndex > 0) {
        return getCheckpointTime(runCheckpoints[currentIndex - 1].id);
      } else {
        const t2FinishCheckpoint = checkpoints.find(
          (cp) => cp.checkpoint_type === "t2_finish"
        );
        return t2FinishCheckpoint
          ? getCheckpointTime(t2FinishCheckpoint.id)
          : null;
      }
    }

    const allCheckpoints = checkpoints.sort(
      (a, b) => a.order_index - b.order_index
    );
    const currentIndex = allCheckpoints.findIndex(
      (cp) => cp.id === currentCheckpoint.id
    );
    if (currentIndex > 0) {
      return getCheckpointTime(checkpoints[currentIndex - 1].id);
    }
    return getCheckpointTime(currentCheckpoint.id);
  };

  // Calculate pace for this checkpoint
  let paceInfo = "";
  let segmentElapsedTime = "";
  if (time && athlete.template) {
    if (checkpoint.checkpoint_type === "swim_finish") {
      paceInfo = calculateCheckpointPace(
        elapsedTime,
        athlete.template.swim_distance,
        checkpoint.checkpoint_type
      );
    } else if (
      checkpoint.checkpoint_type === "bike_checkpoint" &&
      checkpoint.distance_km
    ) {
      const lastCheckpointTime = getLastCheckpointForSegment(
        "bike_checkpoint",
        checkpoint
      );
      if (lastCheckpointTime) {
        segmentElapsedTime = calculateElapsedTime(
          lastCheckpointTime.actual_time,
          time.actual_time
        );
        const bikeCheckpoints = checkpoints
          .filter(
            (cp) =>
              cp.checkpoint_type === "bike_checkpoint" ||
              cp.checkpoint_type === "t1_finish"
          )
          .sort((a, b) => a.order_index - b.order_index);

        const currentIndex = bikeCheckpoints.findIndex(
          (cp) => cp.id === checkpoint.id
        );
        const previousDistance =
          currentIndex > 0 && bikeCheckpoints[currentIndex - 1].distance_km
            ? bikeCheckpoints[currentIndex - 1].distance_km
            : 0;

        const segmentDistance = checkpoint.distance_km - previousDistance;
        paceInfo = calculateCheckpointPace(
          segmentElapsedTime,
          segmentDistance,
          checkpoint.checkpoint_type
        );
      } else {
        paceInfo = calculateCheckpointPace(
          elapsedTime,
          checkpoint.distance_km,
          checkpoint.checkpoint_type
        );
      }
    } else if (
      (checkpoint.checkpoint_type === "run_checkpoint" ||
        checkpoint.checkpoint_type === "finish") &&
      checkpoint.distance_km
    ) {
      const lastCheckpointTime = getLastCheckpointForSegment(
        checkpoint.checkpoint_type,
        checkpoint
      );
      if (lastCheckpointTime) {
        segmentElapsedTime = calculateElapsedTime(
          lastCheckpointTime.actual_time,
          time.actual_time
        );
        const runCheckpoints = checkpoints
          .filter(
            (cp) =>
              cp.checkpoint_type === "run_checkpoint" ||
              cp.checkpoint_type === "t2_finish" ||
              cp.checkpoint_type === "finish"
          )
          .sort((a, b) => a.order_index - b.order_index);

        const currentIndex = runCheckpoints.findIndex(
          (cp) => cp.id === checkpoint.id
        );
        const previousDistance =
          currentIndex > 0 && runCheckpoints[currentIndex - 1].distance_km
            ? runCheckpoints[currentIndex - 1].distance_km
            : 0;

        const segmentDistance =
          checkpoint.checkpoint_type === "finish"
            ? athlete.template.run_distance - previousDistance
            : checkpoint.distance_km - previousDistance;

        paceInfo = calculateCheckpointPace(
          segmentElapsedTime,
          segmentDistance,
          checkpoint.checkpoint_type
        );
      } else if (checkpoint.checkpoint_type === "finish") {
        paceInfo = calculateCheckpointPace(
          elapsedTime,
          athlete.template.run_distance,
          checkpoint.checkpoint_type
        );
      } else {
        paceInfo = calculateCheckpointPace(
          elapsedTime,
          checkpoint.distance_km,
          checkpoint.checkpoint_type
        );
      }
    } else {
      // const lastCheckpointTime = getLastCheckpointForSegment(
      //   checkpoint.checkpoint_type,
      //   checkpoint
      // );
      // segmentElapsedTime = calculateElapsedTime(
      //   lastCheckpointTime.actual_time,
      //   time.actual_time
      // );
    }
  }

  const handleRecordCurrentTime = () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 8); // Gets HH:MM:SS format

    // Create a proper timestamp for today
    const today = new Date();
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    const timestamp = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hours,
      minutes,
      seconds
    );

    // Call the record time function with current time
    onRecordTime(checkpoint.id, timestamp.toISOString());
  };

  const handleEditClick = () => {
    if (time) {
      // Format the current time for the input (HH:MM:SS)
      const currentTime = new Date(time.actual_time).toTimeString().slice(0, 8);
      setEditValue(currentTime);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!time || !editValue.trim()) return;

    try {
      // Get the original date from the existing time record
      const originalDate = new Date(time.actual_time);

      // Parse the new time input
      const [hours, minutes, seconds] = editValue.split(":").map(Number);

      // Create new timestamp with original date but new time
      const timestamp = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate(),
        hours,
        minutes,
        seconds
      );
      editAthleteTimeMutation.mutateAsync({
        checkpoint_id: checkpoint.id,
        athlete_id: athlete.id,
        actual_time: timestamp,
      });
      toast.success("Time updated successfully");
    } catch (error) {
      console.error("Error updating time:", error);
      toast.error("Failed to update time");
    } finally {
      setIsEditing(false);
      setEditValue("");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleDeleteTime = async () => {
    if (!time) return;
    // console.log(time, time.id);

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the time for ${checkpoint.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      useDeleteAthleteTimeMutation.mutateAsync({
        athlete_time_id: time.id,
        athleteId: athlete.id,
      });

      toast.success("Time deleted successfully");
    } catch (error) {
      console.error("Error deleting time:", error);
      toast.error("Failed to delete time");
    } finally {
      setIsDeleting(false);
    }
  };
  console.log(user)
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        {isCompleted ? (
          <CheckCircle className="h-6 w-6 text-green-600" />
        ) : (
          <div className="h-6 w-6 border-2 border-gray-300 rounded-full" />
        )}

        <div>
          <div className="font-semibold">{checkpoint.name}</div>
          {checkpoint.distance_km && (
            <div className="text-sm text-gray-500">
              {checkpoint.distance_km}km
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Badge className={getCheckpointColor(checkpoint)}>
          {checkpoint.checkpoint_type.replace("_", " ")}
        </Badge>

        {time ? (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="HH:MM:SS"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32"
                  disabled={editAthleteTimeMutation.isPending}
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
                />
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editAthleteTimeMutation.isPending}
                  variant="default"
                >
                  <Save className="h-4 w-4" />
                </Button>
                {user ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={editAthleteTimeMutation.isPending}
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDeleteTime}
                      disabled={editAthleteTimeMutation.isPending || isDeleting}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            ) : (
              <>
                <div className="text-right">
                  <div className="font-medium">
                    {new Date(time.actual_time).toLocaleTimeString("en-GB", {
                      hour12: false,
                    })}{" "}
                    ({elapsedTime})
                  </div>
                  <div className="text-sm text-gray-500">
                    This segment: {segmentElapsedTime} {paceInfo}
                  </div>
                </div>
                {user ? (

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={handleEditClick}
                    variant="ghost"
                    className="p-2"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeleteTime}
                    disabled={isDeleting}
                    variant="ghost"
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                ) : null}

              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            {user ? (
              <>
                <Button
                  size="sm"
                  onClick={() => onRecordTime(checkpoint.id)}
                  disabled={!currentTime || isRecording}
                  variant="outline"
                >
                  {isRecording ? "Recording..." : "Record"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleRecordCurrentTime}
                  disabled={isRecording}
                >
                  Now
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
