/**
 * Edit Collection Form Fields Component
 *
 * Handles collection time, meters input, RAM clear, and notes for the Edit Collection Modal.
 */

'use client';

import { Button } from '@/components/ui/button';
import { ModernCalendar } from '@/components/ui/ModernCalendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { formatDate } from '@/lib/utils/formatting';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { Clock, ExternalLink } from 'lucide-react';

type EditCollectionFormFieldsProps = {
  selectedLocationName: string;
  machineForDataEntry: CollectionReportMachineSummary | undefined;
  currentCollectionTime: Date;
  setCurrentCollectionTime: (date: Date) => void;
  isFirstCollection: boolean;
  showAdvancedSas: boolean;
  setShowAdvancedSas: (show: boolean) => void;
  customSasStartTime: Date | null;
  setCustomSasStartTime: (date: Date | null) => void;
  currentMetersIn: string;
  setCurrentMetersIn: (val: string) => void;
  currentMetersOut: string;
  setCurrentMetersOut: (val: string) => void;
  currentRamClearMetersIn: string;
  setCurrentRamClearMetersIn: (val: string) => void;
  currentRamClearMetersOut: string;
  setCurrentRamClearMetersOut: (val: string) => void;
  currentMachineNotes: string;
  setCurrentMachineNotes: (val: string) => void;
  currentRamClear: boolean;
  setCurrentRamClear: (checked: boolean) => void;
  prevIn: number | null;
  prevOut: number | null;
  debouncedCurrentMetersIn: string;
  debouncedCurrentMetersOut: string;
  inputsEnabled: boolean;
  isProcessing: boolean;
  editingEntryId: string | null;
  isAddMachineEnabled: boolean;
  onAddOrUpdateEntry: () => void;
  onCancelEdit: () => void;
  onDisabledFieldClick: () => void;
  onViewMachine: () => void;
};

export default function EditCollectionFormFields({
  selectedLocationName,
  machineForDataEntry,
  currentCollectionTime,
  setCurrentCollectionTime,
  isFirstCollection,
  showAdvancedSas,
  setShowAdvancedSas,
  customSasStartTime,
  setCustomSasStartTime,
  currentMetersIn,
  setCurrentMetersIn,
  currentMetersOut,
  setCurrentMetersOut,
  currentRamClearMetersIn,
  setCurrentRamClearMetersIn,
  currentRamClearMetersOut,
  setCurrentRamClearMetersOut,
  currentMachineNotes,
  setCurrentMachineNotes,
  currentRamClear,
  setCurrentRamClear,
  prevIn,
  prevOut,
  debouncedCurrentMetersIn,
  debouncedCurrentMetersOut,
  inputsEnabled,
  isProcessing,
  editingEntryId,
  isAddMachineEnabled,
  onAddOrUpdateEntry,
  onCancelEdit,
  onDisabledFieldClick,
  onViewMachine,
}: EditCollectionFormFieldsProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-grayHighlight">
          {selectedLocationName} (Prev. Collection:{' '}
          {machineForDataEntry?.collectionTime
            ? formatDate(machineForDataEntry.collectionTime)
            : 'N/A'}
          )
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-100 p-3">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Clock className="h-4 w-4" />
          Machine Data Entry
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {machineForDataEntry
              ? formatMachineDisplayNameWithBold({
                  serialNumber: getSerialNumberIdentifier(machineForDataEntry),
                  custom: { name: machineForDataEntry.name },
                })
              : 'Select a machine to edit'}
          </span>
          {machineForDataEntry && (
            <ExternalLink
              className="h-4 w-4 cursor-pointer text-blue-600 transition-transform hover:scale-110"
              onClick={e => {
                e.stopPropagation();
                onViewMachine();
              }}
            />
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-grayHighlight">
          Collection Time:
        </label>
        <ModernCalendar
          date={{
            from: currentCollectionTime,
            to: currentCollectionTime,
          }}
          onSelect={range => {
            if (range?.from) {
              console.warn('🕐 Collection time changed:', {
                newDate: range.from.toISOString(),
                newDateLocal: range.from.toLocaleString(),
                timestamp: range.from.getTime(),
                previousTime: currentCollectionTime.toISOString(),
              });
              setCurrentCollectionTime(range.from);
            }
          }}
          enableTimeInputs={true}
          mode="single"
          disabled={!inputsEnabled || isProcessing}
        />
        <p className="mt-1 text-xs text-gray-500">
          This time applies to the current machine being added/edited
        </p>
      </div>

      {isFirstCollection && (
        <div className="mb-2">
          <button
            type="button"
            className="text-xs text-button underline"
            onClick={() => setShowAdvancedSas(!showAdvancedSas)}
          >
            {showAdvancedSas
              ? 'Hide Advanced'
              : 'Advanced: Custom previous SAS start'}
          </button>
        </div>
      )}

      {isFirstCollection && showAdvancedSas && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-grayHighlight">
            Previous SAS Start (optional):
          </label>
          <ModernCalendar
            date={
              customSasStartTime
                ? {
                    from: customSasStartTime,
                    to: customSasStartTime,
                  }
                : undefined
            }
            onSelect={range => {
              if (range?.from) {
                setCustomSasStartTime(range.from);
              } else {
                setCustomSasStartTime(null);
              }
            }}
            enableTimeInputs={true}
            mode="single"
            disabled={!inputsEnabled || isProcessing}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to auto-use last collection time or 24h before.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-grayHighlight">
            Meters In:
          </label>
          <div onClick={onDisabledFieldClick}>
            <Input
              type="text"
              placeholder="0"
              value={currentMetersIn}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '')
                  setCurrentMetersIn(val);
              }}
              disabled={!inputsEnabled || isProcessing}
            />
          </div>
          <p className="mt-1 text-xs text-grayHighlight">
            Prev In: {prevIn !== null ? prevIn : 'N/A'}
          </p>
          {debouncedCurrentMetersIn &&
            prevIn &&
            Number(debouncedCurrentMetersIn) < Number(prevIn) && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: Meters In ({debouncedCurrentMetersIn}) should be
                  higher than or equal to Prev In ({prevIn})
                </p>
              </div>
            )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-grayHighlight">
            Meters Out:
          </label>
          <div onClick={onDisabledFieldClick}>
            <Input
              type="text"
              placeholder="0"
              value={currentMetersOut}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '')
                  setCurrentMetersOut(val);
              }}
              disabled={!inputsEnabled || isProcessing}
            />
          </div>
          <p className="mt-1 text-xs text-grayHighlight">
            Prev Out: {prevOut !== null ? prevOut : 'N/A'}
          </p>
          {debouncedCurrentMetersOut &&
            prevOut &&
            Number(debouncedCurrentMetersOut) < Number(prevOut) && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: Meters Out ({debouncedCurrentMetersOut}) should be
                  higher than or equal to Prev Out ({prevOut})
                </p>
              </div>
            )}
        </div>
      </div>

      {currentRamClear && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
          <h4 className="mb-3 text-sm font-medium text-blue-800">
            RAM Clear Meters (Before Rollover)
          </h4>
          <p className="mb-3 text-xs text-blue-600">
            Please enter the last meter readings before the RAM Clear occurred.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-blue-700">
                RAM Clear Meters In:
              </label>
              <Input
                type="text"
                value={currentRamClearMetersIn}
                onChange={e => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val) || val === '')
                    setCurrentRamClearMetersIn(val);
                }}
                disabled={!inputsEnabled || isProcessing}
                className="border-blue-300 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-blue-700">
                RAM Clear Meters Out:
              </label>
              <Input
                type="text"
                value={currentRamClearMetersOut}
                onChange={e => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val) || val === '')
                    setCurrentRamClearMetersOut(val);
                }}
                disabled={!inputsEnabled || isProcessing}
                className="border-blue-300 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      <div
        className="mt-2 flex items-center space-x-2"
        onClick={onDisabledFieldClick}
      >
        <input
          type="checkbox"
          id="ramClearCheckbox"
          checked={currentRamClear}
          onChange={e => setCurrentRamClear(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary"
          disabled={!inputsEnabled || isProcessing}
        />
        <label
          htmlFor="ramClearCheckbox"
          className="text-sm font-medium text-gray-700"
        >
          RAM Clear
        </label>
      </div>

      <div>
        <label className="mb-1 mt-2 block text-sm font-medium text-grayHighlight">
          Notes:
        </label>
        <div onClick={onDisabledFieldClick}>
          <Textarea
            placeholder="Machine-specific notes..."
            value={currentMachineNotes}
            onChange={e => setCurrentMachineNotes(e.target.value)}
            className="min-h-[60px]"
            disabled={!inputsEnabled || isProcessing}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {editingEntryId ? (
          <>
            <Button
              onClick={onCancelEdit}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={onAddOrUpdateEntry}
              className="flex-1 bg-blue-600 text-white"
              disabled={(!inputsEnabled && !editingEntryId) || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Update Entry'}
            </Button>
          </>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onAddOrUpdateEntry}
                  className={`w-full text-white ${isAddMachineEnabled ? 'bg-blue-600' : 'bg-gray-400'}`}
                  disabled={
                    !inputsEnabled || isProcessing || !isAddMachineEnabled
                  }
                >
                  {isProcessing ? 'Processing...' : 'Add Machine to List'}
                </Button>
              </TooltipTrigger>
              {!isAddMachineEnabled && (
                <TooltipContent>
                  <p>
                    {!machineForDataEntry
                      ? 'Select a machine'
                      : 'Fill required fields'}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </>
  );
}
