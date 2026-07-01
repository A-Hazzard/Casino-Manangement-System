'use client';

import { Badge } from '@/components/shared/ui/badge';
import { formatDateWithOrdinal } from '@/lib/utils/date/formatting';
import type { MachineReportHistoryEntry } from '@shared/types/collectionReportHistory';

type MachineReportHistoryListProps = {
  entries: MachineReportHistoryEntry[];
  selectedReportId: string | null;
  currentReportId?: string;
  onSelect: (reportId: string) => void;
};

export default function MachineReportHistoryList({
  entries,
  selectedReportId,
  currentReportId,
  onSelect,
}: MachineReportHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No collection reports found for this machine.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => {
        const isSelected = entry.reportId === selectedReportId;
        const isCurrent = entry.reportId === currentReportId;

        return (
          <button
            key={`${entry.reportVersion}-${entry.reportId}`}
            type="button"
            onClick={() => onSelect(entry.reportId)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              isSelected
                ? 'border-buttonActive bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {formatDateWithOrdinal(new Date(entry.collectedAt))}
              </span>
              <div className="flex items-center gap-1.5">
                {isCurrent && (
                  <Badge className="bg-purple-100 text-[10px] text-purple-800 hover:bg-purple-100">
                    Current
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-wide"
                >
                  V{entry.reportVersion}
                </Badge>
              </div>
            </div>
            <p className="truncate text-xs text-gray-600">{entry.locationName}</p>
            <p className="truncate text-xs text-gray-500">{entry.collectorName}</p>
          </button>
        );
      })}
    </div>
  );
}
