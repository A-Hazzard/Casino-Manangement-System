/**
 * Edit Collection Collected Machines Component
 *
 * Displays the list of machines that have already been collected in the current report.
 *
 * Features:
 * - List of collected machines with key details
 * - Edit and delete actions for each entry
 * - Empty state display
 * - Update All SAS Times functionality (two date pickers for start and end)
 * - Live Reconciliation summary section at the bottom
 *
 * @param collectedMachineEntries - List of machine entries successfully added to the report
 * @param isProcessing - Global loading state for the edit operation
 * @param onEditEntry - Callback to select a machine for editing
 * @param onDeleteEntry - Callback to remove a machine from the collection list
 * @param updateAllSasStartDate - Value for the batch SAS start time update
 * @param setUpdateAllSasStartDate - Setter for the batch SAS start time
 * @param updateAllSasEndDate - Value for the batch SAS end time update
 * @param setUpdateAllSasEndDate - Setter for the batch SAS end time
 * @param onRefresh - Optional callback to refresh report details
 * @param financials - Subset of financial data for the live reconciliation summary
 * @param variationMachineIds - Array of machine IDs with detected meter variations
 * @param onApplyAllDates - Execution callback for applying SAS times block to all entries
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/shared/ui/button';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import type { CollectionDocument } from '@/lib/types/collection';
import { formatDateWithOrdinal } from '@/lib/utils/date/formatting';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { Edit3, Trash2, Info, Search } from 'lucide-react';

type EditCollectionCollectedMachinesProps = {
  collectedMachineEntries: CollectionDocument[];
  isProcessing: boolean;
  onEditEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  updateAllSasStartDate: Date | undefined;
  setUpdateAllSasStartDate: (date: Date | undefined) => void;
  updateAllSasEndDate: Date | undefined;
  setUpdateAllSasEndDate: (date: Date | undefined) => void;
  onRefresh?: () => void;
  financials: {
    amountToCollect: string;
    collectedAmount: string;
    previousBalance: string;
  };
  variationMachineIds?: string[];

  onApplyAllDates: () => void;
};

export default function CollectionReportEditCollectedMachines({
  collectedMachineEntries,
  isProcessing,
  onEditEntry,
  onDeleteEntry,
  updateAllSasStartDate,
  setUpdateAllSasStartDate,
  updateAllSasEndDate,
  setUpdateAllSasEndDate,
  financials,
  variationMachineIds = [],

  onApplyAllDates,
}: EditCollectionCollectedMachinesProps) {
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
    <div className="flex h-[250px] lg:h-full min-h-0 w-full flex-col bg-gray-50 shrink-0">
      <div className="border-b border-gray-300 bg-gray-100 p-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Collected Machines ({collectedMachineEntries.length})
        </h3>
      </div>

      {/* Update All SAS Times - Only show if 2+ machines */}
      {collectedMachineEntries.length >= 2 && (
        <div className="border-b border-gray-300 bg-blue-50 p-3 space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            Update All SAS Times
          </label>

          <div className="flex flex-col gap-2">
            <div>
              <label className="mb-0.5 block text-[9px] font-medium text-gray-500">
                Start Time
              </label>
              <div className="w-full">
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
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="mb-0.5 block text-[9px] font-medium text-gray-500">
                End Time
              </label>
              <div className="w-full">
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
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={onApplyAllDates}
            disabled={(!updateAllSasStartDate && !updateAllSasEndDate) || isProcessing}
            className="mt-1 w-full bg-blue-600 text-[10px] font-bold h-8 hover:bg-blue-700"
            size="sm"
          >
            {isProcessing ? 'Updating...' : 'APPLY TIMES TO ALL'}
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
                    Time: {formatDateWithOrdinal(new Date(entry.sasMeters.sasStartTime))} →{' '}
                    {formatDateWithOrdinal(new Date(entry.sasMeters.sasEndTime))}
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
                  (Prev: {entry.prevIn || 0}) | Meters Out:{' '}
                  {entry.ramClear
                    ? entry.movement?.metersOut || entry.metersOut
                    : entry.metersOut}{' '}
                  (Prev: {entry.prevOut || 0})
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
      {/* Live Reconciliation Summary */}
      {collectedMachineEntries.length > 0 && (
        <div className="border-t border-gray-300 bg-blue-50/50 p-4 pb-1">
          <div className="mb-2 rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
            <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <Info className="h-3 w-3" />
              Live Reconciliation
            </h5>
            <div className="grid grid-cols-2 gap-3 border-t border-blue-50 pt-2">
              <div>
                <p className="text-[8px] font-bold text-gray-400 uppercase">Target</p>
                <p className="text-xs font-black text-gray-900">${financials.amountToCollect || '0.00'}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-gray-400 uppercase">Carryover</p>
                <p className={`text-xs font-black ${Number(financials.previousBalance) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  ${financials.previousBalance || '0.00'}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-[9px] text-gray-400 font-medium">
            Finalize readings for all {collectedMachineEntries.length} machines.
          </p>
        </div>
      )}

    </div>
  );
}
