"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Cross1Icon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useFirmwareActionsStore } from "@/lib/store/firmwareActionsStore";
import { toast } from "sonner";
import deleteIcon from "@/public/deleteIcon.svg";

export const DeleteFirmwareModal = ({
  onDeleteComplete,
}: {
  onDeleteComplete: () => void;
}) => {
  const { isDeleteModalOpen, selectedFirmware, closeDeleteModal } = useFirmwareActionsStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (isDeleteModalOpen) {
      // Only use Tailwind classes for responsive rendering. Remove all JS device detection logic.
    }
  }, [isDeleteModalOpen]);

  const handleClose = () => {
    closeDeleteModal();
  };

  const handleDelete = async () => {
    if (!selectedFirmware || !selectedFirmware._id) return;

    try {
      setLoading(true);

      await axios.delete(`/api/firmwares/${selectedFirmware._id}`);

      toast.success("Firmware deleted successfully!");
      handleClose();
      onDeleteComplete();
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error deleting firmware:", error);
      }
      toast.error("Failed to delete firmware. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isDeleteModalOpen || !selectedFirmware) return null;

  // Desktop View
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Desktop Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="bg-container rounded-md shadow-lg max-w-md w-full"
        >
          <div className="p-4 border-b border-border">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-buttonActive">
                Delete Firmware
              </h2>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-grayHighlight hover:bg-buttonInactive/10"
              >
                <Cross1Icon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Image src={deleteIcon} alt="Delete" width={64} height={64} />
              </div>
              <p className="text-lg font-semibold text-grayHighlight mb-4">
                Are you sure you want to delete{" "}
                <span className="font-bold text-buttonActive">
                  {selectedFirmware.product} {selectedFirmware.version}
                </span>
                ?
              </p>
              <p className="text-sm text-grayHighlight">
                This firmware will be marked as deleted and hidden from the
                list. The file will remain in storage for potential recovery.
              </p>
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
              <Button
                onClick={handleClose}
                className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
