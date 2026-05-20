/**
 * Collection Report V2 — Edit Session Modal
 *
 * Opens the full session report view inside a full-screen modal overlay so the
 * user stays on the sessions list page.
 *
 * Features:
 * - Same layout as the dedicated /collection-report/report/session/[id] page
 * - "Edit Session" button navigates to the session detail page for the full
 *   capture wizard experience (with per-machine pencil icons, camera, etc.)
 * - "Back" button closes the modal instead of navigating away
 *
 * Data: fetched from GET /api/collection-reports-v2/sessions/[sessionId]
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { type useRouter } from 'next/navigation';
import axios from 'axios';
import { Share2, X } from 'lucide-react';
import { gsap } from 'gsap';
import { toast } from 'sonner';
import CollectionReportV2SessionReport from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionReport';

// ============================================================================
// Types
// ============================================================================

type SessionMachine = {
  reportedMachineId: string;
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game?: string;
  status: 'pending' | 'captured' | 'confirmed' | 'skipped';
  sequenceOrder: number;
  sasMetersIn: number;
  sasMetersOut: number;
  manualMetersIn?: number;
  manualMetersOut?: number;
  sasStartTime?: string;
  sasEndTime?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  imageData?: string;
  metersMatch?: boolean;
  machineGross?: number;
  sasGross?: number;
  grossDifference?: number;
  createdAt?: string;
  updatedAt?: string;
};

type SessionDetail = {
  sessionId: string;
  sessionStatus: 'in-progress' | 'submitted';
  locationId: string;
  locationName: string;
  licencee: string;
  collector: string;
  collectorName: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  machinesTotal: number;
  machinesCaptured: number;
  machinesConfirmed: number;
  machinesSkipped: number;
  createdAt: string;
  machines: SessionMachine[];
};

type Props = {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
  /** Called when the user wants to enter the full edit wizard for this session. */
  onEdit?: (sessionId: string) => void;
};

// ============================================================================
// Component
// ============================================================================

export default function CollectionReportV2EditSessionModal({
  isOpen,
  sessionId,
  onClose,
  onEdit,
}: Props) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Fetch session on open
  // ============================================================================

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    setSession(null);
    setError(null);
    setLoading(true);

    axios
      .get<{ success: boolean; data: SessionDetail }>(
        `/api/collection-reports-v2/sessions/${sessionId}`
      )
      .then(res => {
        if (res.data.success) {
          setSession(res.data.data);
        } else {
          setError('Failed to load session data.');
        }
      })
      .catch(() => {
        setError('Failed to load session data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, sessionId]);

  // ============================================================================
  // Animation on open
  // ============================================================================

  useEffect(() => {
    if (isOpen && backdropRef.current && panelRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' }
      );
      gsap.fromTo(
        panelRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [isOpen]);

  // ============================================================================
  // Render
  // ============================================================================

  if (!isOpen) return null;

  // Stub router passed to SessionReport — only push is used (for Back button,
  // which we override via onBack prop to close the modal instead).
  const stubRouter = {
    push: (path: string) => {
      window.location.href = path;
    },
  } as ReturnType<typeof useRouter>;

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60"
        style={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-none bg-gray-50 shadow-2xl md:my-4 md:rounded-xl"
        style={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6">
          <h2 className="text-lg font-bold text-gray-900">Session Report</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={async () => {
                const shareUrl =
                  typeof window !== 'undefined' ? window.location.href : '';
                try {
                  // Use native share sheet on mobile when available, fall back to clipboard.
                  if (navigator.share) {
                    await navigator.share({
                      title: 'Session Report',
                      url: shareUrl,
                    });
                  } else {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success('Link copied to clipboard');
                  }
                } catch (err) {
                  // User dismissed the share sheet — don't show an error toast.
                  const isAbort =
                    err instanceof Error && err.name === 'AbortError';
                  if (!isAbort) {
                    toast.error('Could not share link');
                  }
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Share this report"
              aria-label="Share this report"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Close"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex h-full items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-buttonActive" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full items-center justify-center py-24">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && session && (
            <CollectionReportV2SessionReport
              session={session}
              router={stubRouter}
              onBack={onClose}
              onEdit={onEdit ? () => onEdit(sessionId) : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
