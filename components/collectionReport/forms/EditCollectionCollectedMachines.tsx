/**
 * Edit Collection Collected Machines Component
 *
 * Displays the list of machines that have already been collected in the current report
 *
 * Features:
 * - List of collected machines with key details
 * - Edit and delete actions for each entry
 * - Empty state display
 * - Update All Dates functionality
 */

'use client';

import { Button } from '@/components/ui/button';
import { ModernCalendar } from '@/components/ui/ModernCalendar';
import type { CollectionDocument } from '@/lib/types/collections';
import { formatDate } from '@/lib/utils/formatting';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import axios from 'axios';
import { Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type EditCollectionCollectedMachinesProps = {
  collectedMachineEntries: CollectionDocument[];
  isProcessing: boolean;
  onEditEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  updateAllDate: Date | undefined;
  setUpdateAllDate: (date: Date | undefined) => void;
  onRefresh?: () => void;
};

export default function EditCollectionCollectedMachines({
  collectedMachineEntries,
  isProcessing,
  onEditEntry,
  onDeleteEntry,
  updateAllDate,
  setUpdateAllDate,
  onRefresh,
}: EditCollectionCollectedMachinesProps) {
  const handleUpdateAllDates = async () => {
    if (!updateAllDate) return;

    try {
      // Update all collections in database
      const results = await Promise.allSettled(
        collectedMachineEntries.map(async entry => {
          if (!entry._id) return;

          return await axios.patch(`/api/collections?id=${entry._id}`, {
            timestamp: updateAllDate.toISOString(),
            collectionTime: updateAllDate.toISOString(),
          });
        })
      );

      // Check for failures
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`${failed} machines failed to update`);
        return;
      }

      // Refresh data if callback provided
      if (onRefresh) {
        onRefresh();
      }

      toast.success('All dates updated successfully!');
      setUpdateAllDate(undefined);
    } catch {
      toast.error('Failed to update dates');
    }
  };

  return (
    <div className="flex min-h-0 w-1/5 flex-col border-l border-gray-300 bg-gray-50">
      <div className="border-b border-gray-300 bg-gray-100 p-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Collected Machines ({collectedMachineEntries.length})
        </h3>
      </div>

      {/* Update All Dates - Only show if 2+ machines */}
      {collectedMachineEntries.length >= 2 && (
        <div className="border-b border-gray-300 bg-blue-50 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Update All Dates
          </label>
          <div className="w-full min-w-0">
            <ModernCalendar
              date={
                updateAllDate
                  ? { from: updateAllDate, to: updateAllDate }
                  : undefined
              }
              onSelect={range => {
                if (range?.from) {
                  setUpdateAllDate(range.from);
                } else {
                  setUpdateAllDate(undefined);
                }
              }}
              enableTimeInputs={true}
              mode="single"
              className="w-full min-w-0"
            />
          </div>
          <Button
            onClick={handleUpdateAllDates}
            disabled={!updateAllDate || isProcessing}
            className="mt-2 w-full bg-blue-600 text-xs hover:bg-blue-700"
            size="sm"
          >
            {isProcessing ? 'Updating...' : 'Update All Dates'}
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
                className="relative space-y-1 rounded-md border border-gray-200 bg-white p-3 shadow"
              >
                <p className="break-words text-sm font-semibold text-primary">
                  {formatMachineDisplayNameWithBold({
                    serialNumber: entry.serialNumber,
                    custom: { name: entry.machineCustomName },
                    game: entry.game,
                  })}
                </p>
                <p className="text-xs text-gray-600">
                  Time: {formatDate(entry.timestamp)}
                </p>
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
                <div className="absolute right-2 top-2 flex gap-1">
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
