/**
 * Collection Report V2 — Delete Session Modal
 *
 * 2-step confirmation modal for deleting a V2 session.
 * - Step 1: Choose between Archive or Permanent Delete
 * - Step 2: Confirm the selected action
 *
 * Design follows the amber/red GSAP pattern from LocationsDeleteLocationModal.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Archive, Trash2, Loader2, X } from 'lucide-react';
import { gsap } from 'gsap';

type ModalStep = 'choose' | 'confirmArchive' | 'confirmDelete';

type Props = {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
  onArchive: (sessionId: string) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
};

export default function CollectionReportV2DeleteSessionModal({
  isOpen,
  sessionId,
  onClose,
  onArchive,
  onDelete,
}: Props) {
  const [step, setStep] = useState<ModalStep>('choose');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Animation + reset on open
  // ============================================================================

  useEffect(() => {
    if (isOpen && modalRef.current && backdropRef.current) {
      setStep('choose');
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

  const handleArchive = async () => {
    setLoading(true);
    try {
      await onArchive(sessionId);
      onClose();
    } finally {
      setLoading(false);
    }
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
              <h2 className="text-xl font-bold text-buttonActive">
                {step === 'choose' && 'Remove Session'}
                {step === 'confirmArchive' && 'Archive Session'}
                {step === 'confirmDelete' && 'Delete Session'}
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
          <div className="p-6">
            {/* Step 1: choose action */}
            {step === 'choose' && (
              <div className="text-center">
                <p className="mb-2 text-lg font-semibold text-grayHighlight">
                  What would you like to do with session{' '}
                  <span className="font-bold text-buttonActive">#{shortId}</span>?
                </p>
                <p className="mb-6 text-sm text-grayHighlight/70">
                  Choose how you want to remove this session.
                </p>

                <div className="flex flex-col gap-3">
                  {/* Archive */}
                  <button
                    type="button"
                    onClick={() => setStep('confirmArchive')}
                    className="group flex items-center gap-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-left transition-all hover:border-amber-400 hover:bg-amber-100"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700 transition-colors group-hover:bg-amber-300">
                      <Archive className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">Archive</p>
                      <p className="text-xs text-amber-700/80">
                        Hide from active sessions. Can be restored if needed.
                      </p>
                    </div>
                  </button>

                  {/* Permanent delete */}
                  <button
                    type="button"
                    onClick={() => setStep('confirmDelete')}
                    className="group flex items-center gap-4 rounded-lg border-2 border-red-200 bg-red-50 p-4 text-left transition-all hover:border-red-400 hover:bg-red-100"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-200 text-red-700 transition-colors group-hover:bg-red-300">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-800">Permanent Delete</p>
                      <p className="text-xs text-red-700/80">
                        Remove permanently. This action cannot be undone.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2a: Confirm archive */}
            {step === 'confirmArchive' && (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <Archive className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <p className="mb-4 text-lg font-semibold text-grayHighlight">
                  Archive session{' '}
                  <span className="font-bold text-buttonActive">#{shortId}</span>?
                </p>
                <p className="text-sm text-grayHighlight">
                  The session will be hidden from active views but its data is preserved.
                  Drive images for this session will be deleted.
                </p>
              </div>
            )}

            {/* Step 2b: Confirm permanent delete */}
            {step === 'confirmDelete' && (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <Trash2 className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <p className="mb-4 text-lg font-semibold text-grayHighlight">
                  Permanently delete session{' '}
                  <span className="font-bold text-buttonActive">#{shortId}</span>?
                </p>
                <p className="text-sm text-red-700">
                  All machine records and Drive images for this session will be
                  permanently removed. This cannot be undone.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-border p-4">
            <div className="flex justify-center space-x-4">
              {step === 'choose' && (
                <Button
                  onClick={handleClose}
                  className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                >
                  Cancel
                </Button>
              )}

              {step === 'confirmArchive' && (
                <>
                  <Button
                    onClick={handleArchive}
                    className="bg-amber-500 text-white hover:bg-amber-600"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Session
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setStep('choose')}
                    className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                    disabled={loading}
                  >
                    Back
                  </Button>
                </>
              )}

              {step === 'confirmDelete' && (
                <>
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
                  <Button
                    onClick={() => setStep('choose')}
                    className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                    disabled={loading}
                  >
                    Back
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
