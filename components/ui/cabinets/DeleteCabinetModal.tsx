"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { deleteCabinet } from "@/lib/helpers/cabinets";
import { IMAGES } from "@/lib/constants/images";
import { createActivityLogger } from "@/lib/helpers/activityLogger";
import { toast } from "sonner";

export const DeleteCabinetModal = ({
  onCabinetDeleted,
}: {
  onCabinetDeleted?: () => void;
}) => {
  const { isDeleteModalOpen, selectedCabinet, closeDeleteModal } =
    useCabinetActionsStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Create activity logger for cabinet operations
  const cabinetLogger = createActivityLogger("machine");

  useEffect(() => {
    if (isDeleteModalOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        }
      );
      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, [isDeleteModalOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: "power2.in",
      overwrite: true,
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      overwrite: true,
      onComplete: closeDeleteModal,
    });
  };

  const handleDelete = async () => {
    if (!selectedCabinet) return;
    try {
      const cabinetData = { ...selectedCabinet };
      
      const success = await deleteCabinet(selectedCabinet._id);
      if (success) {
        // Log the cabinet deletion activity
        await cabinetLogger.logDelete(
          selectedCabinet._id,
          `${selectedCabinet.installedGame || selectedCabinet.game || "Unknown"} - ${selectedCabinet.assetNumber || selectedCabinet.serialNumber || "Unknown"}`,
          cabinetData,
          `Deleted cabinet: ${selectedCabinet.installedGame || selectedCabinet.game || "Unknown"} (${selectedCabinet.assetNumber || selectedCabinet.serialNumber || "Unknown"})`
        );

        // Call the callback to refresh data
        onCabinetDeleted?.();
        
        // Show success feedback
        toast.success("Cabinet deleted successfully");
        
        // Close the modal
        handleClose();
      }
    } catch (err) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete cabinet:", err);
      }
    }
  };

  if (!isDeleteModalOpen || !selectedCabinet) return null;

  return (
    <div className="fixed inset-0 z-50">
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
          style={{ opacity: 0, transform: "translateY(-20px)" }}
        >
          <div className="p-6 border-b border-border">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-destructive">
                Confirm Delete
              </h2>
              <Button onClick={handleClose} variant="ghost">
                <Cross2Icon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center text-foreground space-y-4">
              <div className="flex justify-center mb-4">
                <Image src={IMAGES.deleteIcon} alt="Delete" width={64} height={64} />
              </div>
              <p className="text-lg font-semibold">
                Are you sure you want to mark this cabinet as deleted?
              </p>
              <p className="text-sm text-muted-foreground">
                Asset: <strong>{selectedCabinet.assetNumber}</strong>
              </p>
              {selectedCabinet.locationName && (
                <p className="text-sm text-muted-foreground">
                  Location: <strong>{selectedCabinet.locationName}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-border">
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Mark as Deleted
              </Button>
              <Button
                onClick={handleClose}
                className="bg-muted text-muted-foreground hover:bg-accent"
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
