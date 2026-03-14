/**
 * Edit Collection Collected Machines Component
 *
 * Displays the list of machines that have already been collected in the current report
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
import axios from 'axios';
import { Edit3, Trash2, Info, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

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
  isUpdateReportEnabled: boolean;
  onUpdateReport: () => void;
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
  onRefresh,
  financials,
  isUpdateReportEnabled,
  onUpdateReport,
}: EditCollectionCollectedMachinesProps) {
  const handleUpdateAllSasTimes = async () => {
    if (!updateAllSasStartDate && !updateAllSasEndDate) return;

    try {
      const patchData: Record<string, string> = {};
      if (updateAllSasStartDate) patchData.sasStartTime = updateAllSasStartDate.toISOString();
      if (updateAllSasEndDate) patchData.sasEndTime = updateAllSasEndDate.toISOString();

      const results = await Promise.allSettled(
        collectedMachineEntries.map(async entry => {
          if (!entry._id) return;
          return await axios.patch(`/api/collections?id=${entry._id}`, patchData);
        })
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`${failed} machines failed to update`);
        return;
      }

      if (onRefresh) {
        onRefresh();
      }

      toast.success('All SAS times updated successfully!');
      setUpdateAllSasStartDate(undefined);
      setUpdateAllSasEndDate(undefined);
    } catch {
      toast.error('Failed to update SAS times');
    }
  };

  return (
    <div className="flex h-[250px] lg:h-auto min-h-0 w-full lg:w-1/5 flex-col border-t lg:border-t-0 lg:border-l border-gray-300 bg-gray-50 shrink-0">
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
            onClick={handleUpdateAllSasTimes}
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

      {/* Live Reconciliation Summary */}
      {collectedMachineEntries.length > 0 && (
        <div className="border-t border-gray-300 bg-blue-50/50 p-4">
          <div className="mb-3 rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
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

          <Button
            onClick={onUpdateReport}
            disabled={!isUpdateReportEnabled || isProcessing}
            className={`w-full gap-2 rounded-lg py-5 text-xs font-bold shadow-md transition-all active:scale-95 ${
              isUpdateReportEnabled && !isProcessing
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-green-100 shadow-green-600/10'
                : 'bg-gray-400 text-gray-100'
            }`}
          >
            <SendHorizontal className="h-4 w-4" />
            {isProcessing ? 'PROCESSING...' : 'SUBMIT FINAL REPORT'}
          </Button>
          <p className="mt-2 text-center text-[9px] text-gray-400 font-medium">
            Finalize readings for all {collectedMachineEntries.length} machines.
          </p>
        </div>
      )}
    </div>
  );
}
