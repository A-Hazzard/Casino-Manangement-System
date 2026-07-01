/**
 * Machine Report History Modal
 *
 * Full-screen modal showing all V1/V2 collection reports containing a machine,
 * with a selectable timeline and report preview panel.
 */

'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { gsap } from 'gsap';
import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';
import MachineReportHistoryList from './MachineReportHistoryList';
import MachineReportHistoryPreview from './MachineReportHistoryPreview';
import { useMachineReportHistory } from '@/lib/hooks/collectionReport/useMachineReportHistory';
import { MachineReportHistorySkeleton } from '@/components/shared/ui/skeletons/CollectionReportDetailSkeletons';

type MachineReportHistoryModalProps = {
  isOpen: boolean;
  machineId: string;
  machineDisplayName: string;
  gmNumber?: string;
  serialNumber?: string;
  currentReportId?: string;
  onClose: () => void;
};

export default function MachineReportHistoryModal({
  isOpen,
  machineId,
  machineDisplayName,
  gmNumber,
  serialNumber,
  currentReportId,
  onClose,
}: MachineReportHistoryModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    entries,
    selectedEntry,
    selectedReportId,
    setSelectedReportId,
    loading,
    error,
    previewLoading,
    v1Preview,
    v2Preview,
    handleOpenInNewTab,
  } = useMachineReportHistory({
    machineId,
    currentReportId,
    isOpen,
  });

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col md:items-center md:justify-center md:p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/60"
        style={{ opacity: 0 }}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-none bg-gray-50 shadow-2xl md:h-[90vh] md:max-h-[90vh] md:rounded-xl"
        style={{ opacity: 0 }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Machine Report History</h2>
            <div className="flex items-center gap-1">
              <p className="text-sm text-gray-500">{machineDisplayName}</p>
              <CopyMachineFieldsButtons
                machineId={machineId}
                gmNumber={gmNumber}
                serialNumber={serialNumber}
              />
            </div>
          </div>
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
          {loading && <MachineReportHistorySkeleton />}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-1">
              <div className="flex max-h-[42vh] min-h-0 flex-col lg:max-h-full">
                <h3 className="mb-3 flex-shrink-0 text-sm font-semibold uppercase tracking-wide text-gray-600">
                  Reports
                </h3>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1 lg:max-h-full">
                  <MachineReportHistoryList
                    entries={entries}
                    selectedReportId={selectedReportId}
                    currentReportId={currentReportId}
                    onSelect={setSelectedReportId}
                  />
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <h3 className="mb-3 flex-shrink-0 text-sm font-semibold uppercase tracking-wide text-gray-600">
                  Preview
                </h3>
                <div className="min-h-0 flex-1 lg:overflow-hidden">
                  <MachineReportHistoryPreview
                    entry={selectedEntry}
                    machineDisplayName={machineDisplayName}
                    machineId={machineId}
                    gmNumber={gmNumber}
                    serialNumber={serialNumber}
                    previewLoading={previewLoading}
                    v1Preview={v1Preview}
                    v2Preview={v2Preview}
                    onOpenInNewTab={handleOpenInNewTab}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
