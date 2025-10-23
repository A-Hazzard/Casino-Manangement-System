"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import { InfoCircledIcon } from "@radix-ui/react-icons";

type InfoConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
};

export const InfoConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
}: InfoConfirmationDialogProps) => {
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
    if (isLoading) return;

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
    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={(e) => {
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
            e.stopPropagation();
          }}
        >
          <div className="p-6 border-b border-border">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
                variant="ghost"
                disabled={isLoading}
              >
                <Cross2Icon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center text-foreground space-y-4">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4">
                  <InfoCircledIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-base">{message}</p>
            </div>
            {/* Hidden description for accessibility */}
            <div className="sr-only">{message}</div>
          </div>

          <div className="p-6 border-t border-border">
            <div className="flex justify-center gap-4">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirm();
                }}
                className="bg-button hover:bg-buttonActive text-white"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : confirmText}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
