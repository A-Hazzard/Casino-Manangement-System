/**
 * New Collection Collected Machines Component
 *
 * Displays the list of machines that have already been collected in the current batch
 *
 * Features:
 * - List of collected machines with key details
 * - Edit and delete actions for each entry
 * - Empty state display
 * - Update All SAS Times functionality (two date pickers for start and end)
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import type { CollectionDocument } from '@/lib/types/collection';
import { formatDateWithOrdinal } from '@/lib/utils/date/formatting';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { Edit3, Trash2 } from 'lucide-react';

type NewCollectionCollectedMachinesProps = {
  collectedMachineEntries: CollectionDocument[];
  isProcessing: boolean;
  onEditEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  updateAllSasStartDate?: Date | undefined;
  setUpdateAllSasStartDate?: (date: Date | undefined) => void;
  updateAllSasEndDate?: Date | undefined;
  setUpdateAllSasEndDate?: (date: Date | undefined) => void;
  onApplyAllDates?: () => void;
};

export default function CollectionReportNewCollectionCollectedMachines({
  collectedMachineEntries,
  isProcessing,
  onEditEntry,
  onDeleteEntry,
  updateAllSasStartDate,
  setUpdateAllSasStartDate,
  updateAllSasEndDate,
  setUpdateAllSasEndDate,
  onApplyAllDates,
}: NewCollectionCollectedMachinesProps) {
  return (
    <div className="flex min-h-0 w-1/5 flex-col border-l border-gray-300 bg-gray-50">
      <div className="border-b border-gray-300 bg-gray-100 p-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Collected Machines ({collectedMachineEntries.length})
        </h3>
      </div>

      {/* Update All SAS Times - Only show if 2+ machines */}
      {collectedMachineEntries.length >= 2 && setUpdateAllSasStartDate && setUpdateAllSasEndDate && onApplyAllDates && (
        <div className="border-b border-gray-300 bg-blue-50 p-3 space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            Update All SAS Times
          </label>

          {/* SAS Start Time */}
          <div>
            <label className="mb-1 block text-[10px] font-medium text-gray-600">
              SAS Start Time
            </label>
            <div className="w-full min-w-0">
              <ModernCalendar
                date={
                  updateAllSasStartDate
                    ? { from: updateAllSasStartDate, to: updateAllSasStartDate }
                    : undefined
                }
                onSelect={range => {
                  if (range?.from) {
                    setUpdateAllSasStartDate(range.from);
                  } else {
                    setUpdateAllSasStartDate(undefined);
                  }
                }}
                enableTimeInputs={true}
                mode="single"
                className="w-full min-w-0"
              />
            </div>
          </div>

          {/* SAS End Time */}
          <div>
            <label className="mb-1 block text-[10px] font-medium text-gray-600">
              SAS End Time
            </label>
            <div className="w-full min-w-0">
              <ModernCalendar
                date={
                  updateAllSasEndDate
                    ? { from: updateAllSasEndDate, to: updateAllSasEndDate }
                    : undefined
                }
                onSelect={range => {
                  if (range?.from) {
                    setUpdateAllSasEndDate(range.from);
                  } else {
                    setUpdateAllSasEndDate(undefined);
                  }
                }}
                enableTimeInputs={true}
                mode="single"
                className="w-full min-w-0"
              />
            </div>
          </div>

          <Button
            onClick={onApplyAllDates}
            disabled={(!updateAllSasStartDate && !updateAllSasEndDate) || isProcessing}
            className="mt-1 w-full bg-blue-600 text-xs hover:bg-blue-700"
            size="sm"
          >
            {isProcessing ? 'Updating...' : 'Update All SAS Times'}
          </Button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {collectedMachineEntries.length === 0 ? (
          <p className="py-10 text-center text-xs text-gray-500">
            No machines collected yet.
          </p>
        ) : (
          collectedMachineEntries
            .slice()
            .reverse()
            .map((entry, index) => (
              <div
                key={
                  entry._id
                    ? String(entry._id)
                    : `entry-${index}-${
                        entry.machineCustomName || entry.machineId || 'unknown'
                      }`
                }
                className="space-y-1 rounded-md border border-gray-200 bg-white p-3 shadow"
              >
                <p className="break-words text-sm font-semibold text-primary">
                  {formatMachineDisplayNameWithBold({
                    serialNumber: entry.serialNumber,
                    custom: { name: entry.machineCustomName },
                    game: entry.game,
                  })}
                </p>
                {entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime ? (
                  <p className="text-xs text-gray-600">
                    SAS: {formatDateWithOrdinal(entry.sasMeters.sasStartTime)} →{' '}
                    {formatDateWithOrdinal(entry.sasMeters.sasEndTime)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    SAS: Not Set
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  Meters In:{' '}
                  {entry.ramClear
                    ? entry.movement?.metersIn || entry.metersIn
                    : entry.metersIn}{' '}
                  | Meters Out:{' '}
                  {entry.ramClear
                    ? entry.movement?.metersOut || entry.metersOut
                    : entry.metersOut}
                </p>
                {entry.notes && (
                  <p className="text-xs italic text-gray-600">
                    Notes: {entry.notes}
                  </p>
                )}
                {entry.ramClear && (
                  <p className="text-xs font-semibold text-red-600">
                    RAM Clear: Enabled
                  </p>
                )}
                <div className="flex justify-end gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    onClick={() => onEditEntry(String(entry._id))}
                    disabled={isProcessing}
                  >
                    <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    onClick={() => onDeleteEntry(String(entry._id))}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
