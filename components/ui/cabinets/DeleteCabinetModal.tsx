"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import axios from "axios";
import { toast } from "sonner";
import { useUserStore } from "@/lib/store/userStore";
import Image from "next/image";
import deleteIcon from "@/public/deleteIcon.svg";

export const DeleteCabinetModal = ({
  onCabinetDeleted,
}: {
  onCabinetDeleted?: () => void;
}) => {
  const { isDeleteModalOpen, closeDeleteModal, selectedCabinet } =
    useCabinetActionsStore();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);

  // Activity logging function
  const logActivity = async (
    action: string,
    resource: string,
    resourceId: string,
    resourceName: string,
    details: string
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
          username: user?.emailAddress || "unknown",
          userRole: user?.roles?.[0] || "user",
        }),
      });

      if (!response.ok) {
        console.error("Failed to log activity:", response.statusText);
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedCabinet) return;

    setLoading(true);
    try {
      await axios.delete(`/api/machines?id=${selectedCabinet._id}`);

      // Log the deletion activity
      await logActivity(
        "delete",
        "cabinet",
        selectedCabinet._id,
        selectedCabinet.assetNumber || "Unknown Cabinet",
        `Deleted cabinet: ${selectedCabinet.assetNumber || selectedCabinet._id}`
      );

      toast.success("Cabinet deleted successfully");
      onCabinetDeleted?.();
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting cabinet:", error);
      toast.error("Failed to delete cabinet");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeDeleteModal();
  };

  if (!isDeleteModalOpen || !selectedCabinet) return null;

  return (
    <Dialog open={isDeleteModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-destructive">
            Confirm Delete
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            cabinet.
          </DialogDescription>
        </DialogHeader>

        <div className="text-center text-foreground space-y-4">
          <div className="flex justify-center mb-4">
            <Image src={deleteIcon} alt="Delete" width={64} height={64} />
          </div>
          <p className="text-lg font-semibold">
            Are you sure you want to delete this cabinet?
          </p>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Asset Number:</strong>{" "}
              {selectedCabinet.assetNumber || "N/A"}
            </p>
            <p>
              <strong>Location:</strong> {selectedCabinet.locationName || "N/A"}
            </p>
            <p>
              <strong>SMIB ID:</strong>{" "}
              {selectedCabinet.smbId || selectedCabinet.smibBoard || "N/A"}
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-center gap-4">
          <Button
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Yes, Delete It"}
          </Button>
          <Button
            onClick={handleClose}
            className="bg-muted text-muted-foreground hover:bg-muted/90"
            disabled={loading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
