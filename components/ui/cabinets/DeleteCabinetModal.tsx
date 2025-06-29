"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { deleteCabinet } from "@/lib/helpers/cabinets";

export const DeleteCabinetModal = () => {
  const { isDeleteModalOpen, selectedCabinet, closeDeleteModal } =
    useCabinetActionsStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    if (isDeleteModalOpen) {
      if (isMobile) {
        // Mobile animation: Slide up and fade in
        gsap.to(modalRef.current, {
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        });
      } else {
        // Desktop animation: Fade in
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
      }
      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, [isDeleteModalOpen, isMobile]);

  const handleClose = () => {
    if (isMobile) {
      // Mobile animation: Slide down and fade out
      gsap.to(modalRef.current, {
        y: "100%",
        duration: 0.3,
        ease: "power2.in",
        overwrite: true,
      });
    } else {
      // Desktop animation: Fade out
      gsap.to(modalRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: "power2.in",
        overwrite: true,
      });
    }
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
      setLoading(true);
      const success = await deleteCabinet(selectedCabinet._id);
      if (success) {
        handleClose();
        // You could add a toast notification here
      }
    } catch (err) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete cabinet:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isDeleteModalOpen || !selectedCabinet) return null;

  // Desktop View
  if (!isMobile) {
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
                  <Image
                    src="/deleteIcon.svg"
                    alt="Delete"
                    width={64}
                    height={64}
                  />
                </div>
                <p className="text-lg font-semibold">
                  Are you sure you want to delete this cabinet?
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
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Yes, Delete It"}
                </Button>
                <Button
                  onClick={handleClose}
                  className="bg-muted text-muted-foreground hover:bg-accent"
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
  }

  // Mobile View (original bottom sheet modal)
  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div
        ref={modalRef}
        className="fixed bottom-0 left-0 right-0 bg-container rounded-t-2xl p-6 shadow-lg max-h-[90vh]"
        style={{ transform: "translateY(100%)" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-destructive">Confirm Delete</h2>
          <Button onClick={handleClose} variant="ghost">
            <Cross2Icon className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-center text-foreground space-y-4">
          <div className="flex justify-center mb-4">
            <Image src="/deleteIcon.svg" alt="Delete" width={64} height={64} />
          </div>
          <p className="text-lg font-semibold">
            Are you sure you want to delete this cabinet?
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

        <div className="mt-6 flex justify-center gap-4">
          <Button
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Yes, Delete It"}
          </Button>
          <Button
            onClick={handleClose}
            className="bg-muted text-muted-foreground"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
