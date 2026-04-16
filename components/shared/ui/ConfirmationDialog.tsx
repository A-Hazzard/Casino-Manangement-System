/**
 * Confirmation Dialog Component
 * Modal dialog for confirming actions with GSAP animations.
 */
"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { Button } from "@/components/shared/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import Image from "next/image";
import { IMAGES } from '@/lib/constants';

type ConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  footerMessage?: string;
  showFooterWarning?: boolean;
  confirmButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
};

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  footerMessage = "This action cannot be undone. Please ensure you want to proceed.",
  showFooterWarning = true,
  confirmButtonVariant = 'destructive',
}: ConfirmationDialogProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) return;

    gsap.to(modalRef.current, {
      opacity: 0,
      y: 100,
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

  return createPortal(
    <div className="fixed inset-0 z-[100000] pointer-events-auto">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-md rounded-md bg-container shadow-lg"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive">
                {title}
              </h2>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-grayHighlight hover:bg-buttonInactive/10"
              >
                <Cross2Icon className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Image
                  src={confirmButtonVariant === 'destructive' ? IMAGES.deleteIcon : IMAGES.details}
                  alt="Status Icon"
                  width={64}
                  height={64}
                />
              </div>
              <p className="mb-4 text-lg font-semibold text-grayHighlight">
                {message}
              </p>
              {showFooterWarning && (
                <p className="text-sm text-grayHighlight">
                  {footerMessage}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirm();
                }}
                variant={confirmButtonVariant}
                className={confirmButtonVariant === 'destructive' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                disabled={isLoading}
              >
                {isLoading ? (confirmButtonVariant === 'destructive' ? "Deleting..." : "Processing...") : confirmText}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
                className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
