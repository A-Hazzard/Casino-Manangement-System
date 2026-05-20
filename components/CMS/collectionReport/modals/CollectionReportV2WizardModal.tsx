/**
 * Collection Report V2 — Wizard Modal
 *
 * Wraps the full capture wizard (CollectionReportV2SessionDetail) inside a
 * full-screen modal overlay so the user stays on the sessions list page.
 *
 * Used for both creating a new session (after the location-select dialog
 * creates it) and editing an existing in-progress session from the list.
 */
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import CollectionReportV2SessionDetail from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionDetail';

type Props = {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
};

export default function CollectionReportV2WizardModal({
  isOpen,
  sessionId,
  onClose,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen || !sessionId) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60"
        style={{ opacity: 0 }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none bg-gray-50 shadow-2xl md:my-4 md:rounded-xl"
        style={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto">
          <CollectionReportV2SessionDetail
            sessionId={sessionId}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
