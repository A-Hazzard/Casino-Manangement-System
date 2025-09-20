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

import type { DeleteLocationModalProps } from "@/lib/types/components";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

export default function DeleteLocationModal({
  onDelete,
}: DeleteLocationModalProps) {
  const { isDeleteModalOpen, closeDeleteModal, selectedLocation } =
    useLocationActionsStore();
  const locationLogger = createActivityLogger({ id: "system", email: "system", role: "system" });


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
      await locationLogger(
        "delete",
        "location",
        { id: location.location as string, name: (location.locationName as string) || "Unknown Location" },
        [],
        `Deleted location: ${location.locationName as string}`
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
            This will mark the location &quot;{(selectedLocation as Record<string, unknown>)?.locationName as string}
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
