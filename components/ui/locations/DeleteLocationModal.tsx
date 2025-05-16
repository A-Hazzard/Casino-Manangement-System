"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Cross1Icon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import axios from "axios";

export const DeleteLocationModal = () => {
  const { isDeleteModalOpen, selectedLocation, closeDeleteModal } =
    useLocationActionsStore();
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
    if (!selectedLocation || !selectedLocation._id) return;

    try {
      setLoading(true);

      // Log the location ID being sent
      console.log("Deleting location with ID:", selectedLocation._id);

      await axios.delete(`/api/locations`, {
        params: {
          id: selectedLocation._id,
        },
      });
      handleClose();
      // You might want to refresh the locations list after deletion
    } catch (error) {
      console.error("Error deleting location:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isDeleteModalOpen || !selectedLocation) return null;

  // Desktop View
  if (!isMobile) {
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
            style={{ opacity: 0, transform: "translateY(-20px)" }}
          >
            <div className="p-4 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-buttonActive">
                  Delete Location
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
                  <Image
                    src="/deleteIcon.svg"
                    alt="Delete"
                    width={64}
                    height={64}
                  />
                </div>
                <p className="text-lg font-semibold text-grayHighlight mb-4">
                  Are you sure you want to delete the location{" "}
                  <span className="font-bold text-buttonActive">
                    {selectedLocation.locationName}
                  </span>
                  ?
                </p>
                <p className="text-sm text-grayHighlight">
                  This action cannot be undone. The location will be permanently
                  removed from the system.
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
  }

  // Mobile View (original bottom sheet modal)
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="fixed bottom-0 left-0 right-0 bg-container rounded-t-2xl shadow-lg"
        style={{ transform: "translateY(100%)" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-buttonActive">
              Delete Location
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

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <Image src="/deleteIcon.svg" alt="Delete" width={64} height={64} />
          </div>
          <p className="text-lg text-grayHighlight mb-4">
            Are you sure you want to delete the location{" "}
            <span className="font-bold text-buttonActive">
              {selectedLocation.locationName}
            </span>
            ?
          </p>
          <p className="text-sm text-grayHighlight mb-6">
            This action cannot be undone. The location will be permanently
            removed from the system.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border">
          <div className="flex justify-end space-x-4">
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
  );
};
