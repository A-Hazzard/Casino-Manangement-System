/**
 * New Collection Collected Machines Component
 *
 * Displays the list of machines that have already been collected in the current batch.
 *
 * Features:
 * - List of collected machines with key details
 * - Edit and delete actions for each entry
 * - Empty state display
 * - Update All SAS Times functionality (two date pickers for start and end)
 *
 * @param collectedMachineEntries - Array of machine collection documents currently in the batch
 * @param isProcessing - Loading state for async operations
 * @param onEditEntry - Callback to start editing a specific machine entry
 * @param onDeleteEntry - Callback to remove a machine entry from the batch
 * @param updateAllSasStartDate - Current value for the 'Apply All' start date picker
 * @param setUpdateAllSasStartDate - Function to update the 'Apply All' start date
 * @param updateAllSasEndDate - Current value for the 'Apply All' end date picker
 * @param setUpdateAllSasEndDate - Function to update the 'Apply All' end date
 * @param onApplyAllDates - Callback to trigger the batch update of SAS times
 * @param variationMachineIds - Array of machine IDs that have failed variation checks
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/shared/ui/button';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import type { CollectionDocument } from '@/lib/types/collection';
import { formatDateWithOrdinal } from '@/lib/utils/date/formatting';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { Edit3, Trash2, Search, Info } from 'lucide-react';

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
  variationMachineIds?: string[];
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
  variationMachineIds = [],
}: NewCollectionCollectedMachinesProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const reversed = collectedMachineEntries.slice().reverse();
    if (!searchQuery.trim()) return reversed;
    const searchTermLower = searchQuery.toLowerCase();
    return reversed.filter(entry =>
      (entry.serialNumber?.toLowerCase() || '').includes(searchTermLower) ||
      (entry.machineCustomName?.toLowerCase() || '').includes(searchTermLower) ||
      (entry.machineId?.toLowerCase() || '').includes(searchTermLower) ||
      (entry.game?.toLowerCase() || '').includes(searchTermLower)
    );
  }, [collectedMachineEntries, searchQuery]);

  return (
    <div className="flex min-h-0 w-full flex-col bg-gray-50">
      <div className="border-b border-gray-300 bg-gray-100 p-3">
        <h3 className="text-sm font-bold text-gray-700">
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
              Start Time
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

          {/* Start Time */}
          <div>
            <label className="mb-1 block text-[10px] font-medium text-gray-600">
              End Time
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
            {isProcessing ? 'Updating...' : 'Update All Times'}
          </Button>
        </div>
      )}

      {/* Search collected machines */}
      {collectedMachineEntries.length > 0 && (
        <div className="border-b border-gray-300 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search collected..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {collectedMachineEntries.length === 0 ? (
          <p className="py-10 text-center text-xs text-gray-500">
            No machines collected yet.
          </p>
        ) : filteredEntries.length === 0 ? (
          <p className="py-10 text-center text-xs text-gray-500">
            No machines match your search.
          </p>
        ) : (
          filteredEntries.map((entry, index) => {
            const hasVariation = variationMachineIds.some(vid => String(vid) === String(entry.machineId));
            return (
              <div
                key={
                  entry._id
                    ? String(entry._id)
                    : `entry-${index}-${
                        entry.machineCustomName || entry.machineId || 'unknown'
                      }`
                }
                className={`space-y-1 rounded-md border p-3 shadow transition-colors ${
                  hasVariation 
                    ? 'border-amber-400 bg-amber-50 shadow-amber-100 ring-1 ring-amber-400' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className={`break-words text-sm font-bold ${hasVariation ? 'text-amber-900' : 'text-primary'}`}>
                    {formatMachineDisplayNameWithBold({
                      serialNumber: entry.serialNumber,
                      custom: { name: entry.machineCustomName },
                      game: entry.game,
                    })}
                  </p>
                  {hasVariation && (
                    <div className="shrink-0 flex items-center gap-0.5 rounded bg-amber-500 px-1 py-0.5 text-[8px] font-black uppercase text-white shadow-sm">
                      <Info className="h-2 w-2" />
                      Variation
                    </div>
                  )}
                </div>
                {entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime ? (
                  <p className={`text-xs ${hasVariation ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                    Time: {formatDateWithOrdinal(entry.sasMeters.sasStartTime)} →{' '}
                    {formatDateWithOrdinal(entry.sasMeters.sasEndTime)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Time: Not Set
                  </p>
                )}
                <p className={`text-xs ${hasVariation ? 'text-amber-800' : 'text-gray-600'}`}>
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
                  <p className={`text-xs italic ${hasVariation ? 'text-amber-700' : 'text-gray-600'}`}>
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
                    className={`h-6 w-6 p-0 ${hasVariation ? 'hover:bg-amber-200' : 'hover:bg-gray-200'}`}
                    onClick={() => onEditEntry(String(entry._id))}
                    disabled={isProcessing}
                  >
                    <Edit3 className={`h-3.5 w-3.5 ${hasVariation ? 'text-amber-700' : 'text-blue-600'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 p-0 ${hasVariation ? 'hover:bg-amber-200' : 'hover:bg-gray-200'}`}
                    onClick={() => onDeleteEntry(String(entry._id))}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
