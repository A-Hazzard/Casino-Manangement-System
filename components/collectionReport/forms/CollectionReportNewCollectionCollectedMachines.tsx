/**
 * New Collection Collected Machines Component
 *
 * Displays the list of machines that have already been collected in the current batch
 *
 * Features:
 * - List of collected machines with key details
 * - Edit and delete actions for each entry
 * - Empty state display
 */

'use client';

import { Button } from '@/components/ui/button';
import type { CollectionDocument } from '@/lib/types/collections';
import { formatDate } from '@/lib/utils/formatting';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { Edit3, Trash2 } from 'lucide-react';

type NewCollectionCollectedMachinesProps = {
  collectedMachineEntries: CollectionDocument[];
  isProcessing: boolean;
  onEditEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
};

export default function CollectionReportNewCollectionCollectedMachines({
  collectedMachineEntries,
  isProcessing,
  onEditEntry,
  onDeleteEntry,
}: NewCollectionCollectedMachinesProps) {
  return (
    <div className="flex min-h-0 w-1/5 flex-col border-l border-gray-300 bg-gray-50">
      <div className="border-b border-gray-300 bg-gray-100 p-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Collected Machines ({collectedMachineEntries.length})
        </h3>
      </div>
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
