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

interface DeleteLocationModalProps {
  onLocationDeleted: () => void;
}

export const DeleteLocationModal: React.FC<DeleteLocationModalProps> = ({
  onLocationDeleted,
}) => {
  const { isDeleteModalOpen, closeDeleteModal, selectedLocation } =
    useLocationActionsStore();

  const handleClose = () => {
    closeDeleteModal();
  };

  const handleDelete = async () => {
    if (!selectedLocation?._id) return;

    try {
      await axios.delete(`/api/locations/${selectedLocation._id}`);
      toast.success("Location deleted successfully");
      onLocationDeleted();
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
            This action cannot be undone. This will permanently delete the
            location &quot;{selectedLocation?.name}&quot;.
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
};
