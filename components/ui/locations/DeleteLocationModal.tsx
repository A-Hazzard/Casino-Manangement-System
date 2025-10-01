"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import axios from "axios";
import { toast } from "sonner";
import { useUserStore } from "@/lib/store/userStore";

import type { DeleteLocationModalProps } from "@/lib/types/components";

export default function DeleteLocationModal({
  onDelete,
}: DeleteLocationModalProps) {
  const { isDeleteModalOpen, closeDeleteModal, selectedLocation } =
    useLocationActionsStore();
  const { user } = useUserStore();

  // Helper function to get proper user display name for activity logging
  const getUserDisplayName = () => {
    if (!user) return "Unknown User";

    // Check if user has profile with firstName and lastName
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    // If only firstName exists, use it
    if (user.profile?.firstName && !user.profile?.lastName) {
      return user.profile.firstName;
    }

    // If only lastName exists, use it
    if (!user.profile?.firstName && user.profile?.lastName) {
      return user.profile.lastName;
    }

    // If neither firstName nor lastName exist, use username
    if (user.username && user.username.trim() !== "") {
      return user.username;
    }

    // If username doesn't exist or is blank, use email
    if (user.emailAddress && user.emailAddress.trim() !== "") {
      return user.emailAddress;
    }

    // Fallback
    return "Unknown User";
  };

  // Activity logging is now handled via API calls
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string,
    previousData?: Record<string, unknown> | null,
    newData?: Record<string, unknown> | null
  ) => {
    try {
      const response = await fetch("/api/activity-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          resourceName,
          details,
          userId: user?._id || "unknown",
          username: getUserDisplayName(),
          userRole: "user",
          previousData: previousData || null,
          newData: newData || null,
          changes: [], // Will be calculated by the API
        }),
      });

      if (!response.ok) {
        console.error("Failed to log activity:", response.statusText);
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const handleClose = () => {
    // Modal closed
    closeDeleteModal();
  };

  const handleDelete = async () => {
    const location = selectedLocation as Record<string, unknown>;
    if (!location?.location) return;

    try {
      await axios.delete(`/api/locations?id=${location.location}`);

      // Log the deletion activity
      await logActivity(
        "delete",
        "location",
        location.location as string,
        (location.locationName as string) || "Unknown Location",
        `Deleted location: ${location.locationName as string}`,
        location, // Previous data (the deleted location)
        null // No new data for deletion
      );

      toast.success("Location deleted successfully");
      onDelete();
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  return (
    <Dialog open={isDeleteModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This will mark the location &quot;
            {
              (selectedLocation as Record<string, unknown>)
                ?.locationName as string
            }
            &quot; as deleted. The location will be hidden from the system but
            can be restored if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
