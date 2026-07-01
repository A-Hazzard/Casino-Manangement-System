'use client';

import { Button } from '@/components/shared/ui/button';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CollectionReportData } from '@/lib/types/api';
import { formatDateWithOrdinal } from '@/lib/utils/date/formatting';
import { getGrossColorClass } from '@/lib/utils/financial';
import type { MachineReportHistoryEntry } from '@shared/types/collectionReportHistory';
import { ExternalLink, Loader2 } from 'lucide-react';
import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';

type V2SessionMachinePreview = {
  machineId: string;
  machineName: string;
  machineGross?: number;
  sasGross?: number;
  variation?: number;
  sasMetersIn: number | null;
  sasMetersOut: number | null;
};

type V2SessionPreview = {
  sessionId: string;
  locationName: string;
  collectorName: string;
  sessionEndTime?: string;
  createdAt: string;
  machine: V2SessionMachinePreview | null;
};

type MachineReportHistoryPreviewProps = {
  entry: MachineReportHistoryEntry | null;
  machineDisplayName: string;
  machineId: string;
  gmNumber?: string;
  serialNumber?: string;
  previewLoading: boolean;
  v1Preview: CollectionReportData | null;
  v2Preview: V2SessionPreview | null;
  onOpenInNewTab: () => void;
};

export default function MachineReportHistoryPreview({
  entry,
  machineDisplayName,
  machineId,
  gmNumber,
  serialNumber,
  previewLoading,
  v1Preview,
  v2Preview,
  onOpenInNewTab,
}: MachineReportHistoryPreviewProps) {
  const { formatAmount } = useCurrencyFormat();

  if (!entry) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        Select a report to preview machine history.
      </div>
    );
  }

  const machineMetric =
    v1Preview?.machineMetrics.find(
      metric => metric.actualMachineId === machineId
    ) ?? null;

  const machineGross = entry.machineGross;
  const sasGross = entry.sasGross;
  const variation = entry.variation;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="bg-lighterBlueHighlight px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/80">
              Report Preview
            </p>
            <h3 className="flex items-center gap-1 text-base font-semibold">
              {machineDisplayName}
              <CopyMachineFieldsButtons
                machineId={machineId}
                gmNumber={gmNumber ?? machineMetric?.machineCustomName}
                serialNumber={serialNumber ?? machineMetric?.serialNumber}
                className="text-white/70"
              />
            </h3>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
            V{entry.reportVersion}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewField
            label="Collected"
            value={formatDateWithOrdinal(new Date(entry.collectedAt))}
          />
          <PreviewField label="Location" value={entry.locationName} />
          <PreviewField label="Collector" value={entry.collectorName} />
          <PreviewField
            label="Report Type"
            value={
              entry.reportVersion === 2
                ? 'Collection Report V2'
                : 'Collection Report V1'
            }
          />
        </div>

        {previewLoading ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-buttonActive" />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">
              Machine Metrics in This Report
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewField
                label="Meter In / Out"
                value={`${formatAmount(entry.metersIn)} / ${formatAmount(entry.metersOut)}`}
              />
              <PreviewField
                label="Machine Gross"
                value={formatAmount(machineGross)}
                valueClassName={getGrossColorClass(machineGross)}
              />
              <PreviewField
                label="SAS Gross"
                value={sasGross === null ? '—' : formatAmount(sasGross)}
              />
              <PreviewField
                label="Variation"
                value={variation === null ? '—' : formatAmount(variation)}
                valueClassName={
                  variation === null ? '' : getGrossColorClass(variation)
                }
              />
            </div>

            {entry.reportVersion === 1 && machineMetric && (
              <div className="mt-4 border-t border-gray-200 pt-4 text-xs text-gray-500">
                <p>Drop / Cancelled: {machineMetric.dropCancelled || '0 / 0'}</p>
              </div>
            )}

            {entry.reportVersion === 2 && v2Preview?.machine && (
              <div className="mt-4 border-t border-gray-200 pt-4 text-xs text-gray-500">
                <p>Machine: {v2Preview.machine.machineName}</p>
              </div>
            )}

            {entry.reportGross !== undefined && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <PreviewField
                  label="Report Gross"
                  value={formatAmount(entry.reportGross)}
                  valueClassName={getGrossColorClass(entry.reportGross)}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex justify-end">
          <Button
            type="button"
            onClick={onOpenInNewTab}
            className="bg-buttonActive text-white hover:bg-buttonActive/90"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Report in New Tab
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewField({
  label,
  value,
  valueClassName = 'text-gray-900',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}
