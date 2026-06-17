/**
 * Collection Report V2 — Delete Session Modal
 *
 * Single-step confirmation modal for permanently deleting a V2 session.
 * Warns the user that the action cannot be undone.
 *
 * Design follows the red GSAP pattern.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Trash2, Loader2, X } from 'lucide-react';
import { gsap } from 'gsap';

type Props = {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
  onDelete: (sessionId: string) => Promise<void>;
};

export default function CollectionReportV2DeleteSessionModal({
  isOpen,
  sessionId,
  onClose,
  onDelete,
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

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(sessionId);
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
        >
          {/* ── Header ── */}
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-red-600">
                Delete Session
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

          {/* ── Body ── */}
          <div className="p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <p className="mb-2 text-lg font-semibold text-grayHighlight">
              Permanently delete session{' '}
              <span className="font-bold text-buttonActive">
                #{shortId}
              </span>
              ?
            </p>
            <p className="text-sm font-medium text-red-700">
              All machine records and Drive images for this session will be
              permanently removed. This action cannot be undone.
            </p>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleClose}
                className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
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
