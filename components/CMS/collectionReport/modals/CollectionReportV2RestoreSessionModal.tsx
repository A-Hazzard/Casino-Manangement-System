/**
 * Collection Report V2 — Restore Session Modal
 *
 * Confirmation modal for restoring an archived V2 collection session.
 * Design follows the GSAP animation pattern from V2DeleteSessionModal.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { RotateCcw, Loader2, X } from 'lucide-react';
import { gsap } from 'gsap';

type Props = {
  isOpen: boolean;
  sessionId: string;
  locationName: string;
  onClose: () => void;
  onConfirm: (sessionId: string) => Promise<void>;
};

export default function CollectionReportV2RestoreSessionModal({
  isOpen,
  sessionId,
  locationName,
  onClose,
  onConfirm,
}: Props) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (isOpen && modalRef.current && backdropRef.current) {
      setLoading(false);
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
    }
  }, [isOpen]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(sessionId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  if (!isOpen) return null;

  const shortId = sessionId ? sessionId.slice(-8).toUpperCase() : '—';

  return (
    <div className="fixed inset-0 z-[100000]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        style={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-md overflow-hidden rounded-md bg-container shadow-lg"
          style={{ opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-green-600">
                Restore Session
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

          {/* Body */}
          <div className="p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <RotateCcw className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <p className="mb-1 text-lg font-semibold text-grayHighlight">
              Restore session{' '}
              <span className="font-bold text-green-600">#{shortId}</span>?
            </p>
            {locationName && (
              <p className="mb-2 text-sm text-grayHighlight/80">
                {locationName}
              </p>
            )}
            <p className="text-sm text-grayHighlight/70">
              The session will reappear in the active sessions list.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Session
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
