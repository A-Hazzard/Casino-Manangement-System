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
import Image from "next/image";
import deleteIcon from "@/public/deleteIcon.svg";
import type { DeleteLocationModalProps } from "@/lib/types/components";

export default function DeleteLocationModal({
  isOpen,
  onClose,
  location,
  onDelete,
}: DeleteLocationModalProps) {
  const { isDeleteModalOpen, closeDeleteModal, selectedLocation } =
    useLocationActionsStore();

  const handleClose = () => {
    closeDeleteModal();
  };

  const handleDelete = async () => {
    if (!selectedLocation?._id) return;

    try {
      await axios.delete(`/api/locations?id=${selectedLocation._id}`);
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
            This will mark the location &quot;{selectedLocation?.name}&quot; as
            deleted. The location will be hidden from the system but can be
            restored if needed.
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
