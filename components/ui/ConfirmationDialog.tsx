"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  isLoading = false,
}: ConfirmationDialogProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            // Ensure the modal is fully visible and clickable
            if (modalRef.current) {
              modalRef.current.style.pointerEvents = "auto";
              modalRef.current.style.opacity = "1";
              modalRef.current.style.transform = "translateY(0px)";
            }
          },
        }
      );
      gsap.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, [isOpen]);

  const handleClose = () => {
    console.warn("ConfirmationDialog: handleClose called");
    if (isLoading) return; // Prevent closing while loading

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
      onComplete: onClose,
    });
  };

  const handleConfirm = () => {
    console.warn("ConfirmationDialog: handleConfirm called");
    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={(e) => {
          console.warn("Backdrop clicked");
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={modalRef}
          className="bg-container rounded-md shadow-lg max-w-md w-full pointer-events-auto relative z-10"
          style={{ opacity: 0, transform: "translateY(-20px)" }}
          onClick={(e) => {
            console.warn("Modal content clicked");
            e.stopPropagation();
          }}
        >
          <div
            className="p-6 border-b border-border"
            onClick={() => console.warn("Header area clicked")}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-destructive">{title}</h2>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.warn("Header close button clicked");
                  handleClose();
                }}
                variant="ghost"
                disabled={isLoading}
              >
                <Cross2Icon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div
            className="p-6"
            onClick={() => console.warn("Content area clicked")}
          >
            <div className="text-center text-foreground space-y-4">
              <div className="flex justify-center mb-4">
                <Image
                  src={IMAGES.deleteIcon}
                  alt="Delete"
                  width={64}
                  height={64}
                />
              </div>
              <div className="text-xs text-gray-500">
                Modal is clickable - check console for click events
              </div>
              <p className="text-lg font-semibold">{message}</p>
            </div>
            {/* Hidden description for accessibility */}
            <div className="sr-only">{message}</div>
          </div>

          <div
            className="p-6 border-t border-border"
            onClick={() => console.warn("Button area clicked")}
          >
            <div className="flex justify-center gap-4">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.warn("Confirm button clicked");
                  handleConfirm();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : confirmText}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.warn("Cancel button clicked");
                  handleClose();
                }}
                className="bg-muted text-muted-foreground hover:bg-accent"
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
