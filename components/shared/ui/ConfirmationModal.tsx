'use client';

import { Button } from '@/components/shared/ui/button';
import { Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { IMAGES } from '@/lib/constants';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';

type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: 'default' | 'destructive';
};

export default function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  loading = false,
  variant = 'default',
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
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
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    onOpenChange(false);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000]">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-md rounded-md bg-container shadow-lg overflow-hidden"
          style={{ opacity: 0 }}
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
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center">
              {variant === 'destructive' && (
                <div className="mb-4 flex justify-center">
                  <Image
                    src={IMAGES.deleteIcon}
                    alt="Delete"
                    width={64}
                    height={64}
                  />
                </div>
              )}
              <p className="mb-4 text-lg font-semibold text-grayHighlight">
                {description}
              </p>
              {variant === 'destructive' && (
                <p className="text-sm text-grayHighlight">
                  This action cannot be undone. This item will be permanently
                  removed from the system.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
                disabled={loading}
                className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-button text-white hover:bg-buttonActive'}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Processing...' : confirmLabel}
              </Button>
              <Button
                onClick={handleClose}
                disabled={loading}
                className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
              >
                {cancelLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
