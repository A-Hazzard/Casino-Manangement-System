/**
 * Info Confirmation Dialog Component
 * Modal dialog for informational confirmations with GSAP animations.
 *
 * Features:
 * - Info dialog with title and message
 * - Confirm and cancel buttons
 * - Info icon display
 * - Loading state support
 * - GSAP animations
 * - Customizable button text
 * - Close button
 *
 * @param isOpen - Whether the dialog is visible
 * @param onClose - Callback to close the dialog
 * @param onConfirm - Callback when confirm is clicked
 * @param title - Dialog title
 * @param message - Dialog message
 * @param confirmText - Text for confirm button
 * @param cancelText - Text for cancel button
 * @param isLoading - Whether action is in progress
 */
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { Button } from '@/components/shared/ui/button';
import { Cross2Icon } from '@radix-ui/react-icons';
import { InfoCircledIcon } from '@radix-ui/react-icons';

// ============================================================================
// Types
// ============================================================================

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
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}: InfoConfirmationDialogProps) => {
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
      ease: 'power2.in',
      overwrite: true,
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      overwrite: true,
      onComplete: onClose,
    });
  };

  const handleConfirm = () => {
    onConfirm();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={e => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 h-screen">
        <div
          ref={modalRef}
          className="w-full max-w-md rounded-md bg-container shadow-lg"
          style={{ opacity: 0, transform: 'translateY(-20px)' }}
          onClick={e => {
            e.stopPropagation();
          }}
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-buttonActive">{title}</h2>
              <Button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
                variant="ghost"
                className="h-8 w-8 p-0 text-grayHighlight hover:bg-buttonInactive/10"
                disabled={isLoading}
              >
                <Cross2Icon className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
                  <InfoCircledIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-lg font-semibold text-grayHighlight">
                {message}
              </p>
            </div>
          </div>

          <div className="border-t border-border p-4">
            <div className="flex justify-center gap-4">
              <Button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirm();
                }}
                className="bg-button text-white hover:bg-buttonActive"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : confirmText}
              </Button>
              <Button
                onClick={e => {
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

