/**
 * New Collection Form Fields Component
 *
 * Handles collection time, meters input, RAM clear, and notes for the New Collection Modal
 *
 * Features:
 * - Collection time picker
 * - Meters In/Out inputs with validation
 * - RAM Clear checkbox and meters
 * - Advanced SAS start override
 * - Machine notes
 * - Add/Update entry buttons
 */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModernCalendar } from '@/components/ui/ModernCalendar';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDate } from '@/lib/utils/formatting';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { ExternalLink } from 'lucide-react';

type NewCollectionFormFieldsProps = {
  selectedLocationName: string;
  previousCollectionTime: Date | null;
  machineForDataEntry: {
    name?: string;
    serialNumber?: string;
    custom?: { name?: string };
    game?: string;
  } | null;
  currentCollectionTime: Date;
  isFirstCollection: boolean;
  showAdvancedSas: boolean;
  customSasStartTime: Date | null;
  currentMetersIn: string;
  currentMetersOut: string;
  currentRamClearMetersIn: string;
  currentRamClearMetersOut: string;
  currentMachineNotes: string;
  currentRamClear: boolean;
  prevIn: number | null;
  prevOut: number | null;
  debouncedCurrentMetersIn: string;
  debouncedCurrentMetersOut: string;
  debouncedCurrentRamClearMetersIn: string;
  debouncedCurrentRamClearMetersOut: string;
  inputsEnabled: boolean;
  isProcessing: boolean;
  editingEntryId: string | null;
  isAddMachineEnabled: boolean;
  onCollectionTimeChange: (date: Date) => void;
  onAdvancedSasToggle: () => void;
  onCustomSasStartTimeChange: (date: Date | null) => void;
  onMetersInChange: (value: string) => void;
  onMetersOutChange: (value: string) => void;
  onRamClearMetersInChange: (value: string) => void;
  onRamClearMetersOutChange: (value: string) => void;
  onMachineNotesChange: (value: string) => void;
  onRamClearChange: (checked: boolean) => void;
  onDisabledFieldClick: () => void;
  onAddEntry: () => void;
  onCancelEdit: () => void;
  onAddOrUpdateEntry: () => void;
  onViewMachine: () => void;
};

export default function CollectionReportNewCollectionFormFields({
  selectedLocationName,
  previousCollectionTime,
  machineForDataEntry,
  currentCollectionTime,
  isFirstCollection,
  showAdvancedSas,
  customSasStartTime,
  currentMetersIn,
  currentMetersOut,
  currentRamClearMetersIn,
  currentRamClearMetersOut,
  currentMachineNotes,
  currentRamClear,
  prevIn,
  prevOut,
  debouncedCurrentMetersIn,
  debouncedCurrentMetersOut,
  debouncedCurrentRamClearMetersIn,
  debouncedCurrentRamClearMetersOut,
  inputsEnabled,
  isProcessing,
  editingEntryId,
  isAddMachineEnabled,
  onCollectionTimeChange,
  onAdvancedSasToggle,
  onCustomSasStartTimeChange,
  onMetersInChange,
  onMetersOutChange,
  onRamClearMetersInChange,
  onRamClearMetersOutChange,
  onMachineNotesChange,
  onRamClearChange,
  onDisabledFieldClick,
  onAddEntry,
  onCancelEdit,
  onAddOrUpdateEntry,
  onViewMachine,
}: NewCollectionFormFieldsProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-grayHighlight">
          {selectedLocationName} (Prev. Collection:{' '}
          {previousCollectionTime ? formatDate(previousCollectionTime) : 'N/A'})
        </p>
      </div>

      <Button
        variant="default"
        className="flex w-full items-center justify-between bg-lighterBlueHighlight text-primary-foreground"
      >
        <span>
          {machineForDataEntry
            ? formatMachineDisplayNameWithBold(machineForDataEntry)
            : 'Select a machine to edit'}
        </span>
        {machineForDataEntry && (
          <ExternalLink
            className="ml-2 h-4 w-4 cursor-pointer transition-transform hover:scale-110"
            onClick={e => {
              e.stopPropagation();
              onViewMachine();
            }}
          />
        )}
      </Button>

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
              onCollectionTimeChange(range.from);
            }
          }}
          enableTimeInputs={true}
          mode="single"
        />
        <p className="mt-1 text-xs text-gray-500">
          This time applies to the current machine being added/edited
        </p>
      </div>

      {/* Advanced SAS Start override - Only show for first collection */}
      {isFirstCollection && (
        <div className="mb-2">
          <button
            type="button"
            className="text-xs text-button underline"
            onClick={onAdvancedSasToggle}
          >
            {showAdvancedSas ? 'Hide Advanced' : 'Advanced: Custom previous SAS start'}
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
                onCustomSasStartTimeChange(range.from);
              } else {
                onCustomSasStartTimeChange(null);
              }
            }}
            enableTimeInputs={true}
            mode="single"
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
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onMetersInChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
            />
          </div>
          <p className="mt-1 text-xs text-grayHighlight">
            Prev In: {prevIn !== null ? prevIn : 'N/A'}
          </p>
          {/* Regular Meters In Validation - Debounced */}
          {debouncedCurrentMetersIn &&
            prevIn &&
            Number(debouncedCurrentMetersIn) < Number(prevIn) && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: Meters In ({debouncedCurrentMetersIn}) should be higher
                  than or equal to Previous Meters In ({prevIn})
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
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onMetersOutChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
            />
          </div>
          <p className="mt-1 text-xs text-grayHighlight">
            Prev Out: {prevOut !== null ? prevOut : 'N/A'}
          </p>
          {/* Regular Meters Out Validation - Debounced */}
          {debouncedCurrentMetersOut &&
            prevOut &&
            Number(debouncedCurrentMetersOut) < Number(prevOut) && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: Meters Out ({debouncedCurrentMetersOut}) should be higher
                  than or equal to Previous Meters Out ({prevOut})
                </p>
              </div>
            )}
        </div>
      </div>

      {/* RAM Clear Meter Inputs - Only show when RAM Clear is checked */}
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
                placeholder="0"
                value={currentRamClearMetersIn}
                onChange={e => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                    onRamClearMetersInChange(val);
                  }
                }}
                disabled={!inputsEnabled || isProcessing}
                className={`border-blue-300 focus:border-blue-500 ${
                  debouncedCurrentRamClearMetersIn &&
                  prevIn &&
                  Number(debouncedCurrentRamClearMetersIn) > Number(prevIn)
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {/* RAM Clear Meters In Validation - Debounced */}
              {debouncedCurrentRamClearMetersIn &&
                prevIn &&
                Number(debouncedCurrentRamClearMetersIn) > Number(prevIn) && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                    <p className="text-xs text-red-600">
                      Warning: RAM Clear Meters In ({debouncedCurrentRamClearMetersIn})
                      should be lower than or equal to Previous Meters In ({prevIn})
                    </p>
                  </div>
                )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-blue-700">
                RAM Clear Meters Out:
              </label>
              <Input
                type="text"
                placeholder="0"
                value={currentRamClearMetersOut}
                onChange={e => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                    onRamClearMetersOutChange(val);
                  }
                }}
                disabled={!inputsEnabled || isProcessing}
                className={`border-blue-300 focus:border-blue-500 ${
                  debouncedCurrentRamClearMetersOut &&
                  prevOut &&
                  Number(debouncedCurrentRamClearMetersOut) > Number(prevOut)
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {/* RAM Clear Meters Out Validation - Debounced */}
              {debouncedCurrentRamClearMetersOut &&
                prevOut &&
                Number(debouncedCurrentRamClearMetersOut) > Number(prevOut) && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                    <p className="text-xs text-red-600">
                      Warning: RAM Clear Meters Out ({debouncedCurrentRamClearMetersOut})
                      should be lower than or equal to Previous Meters Out ({prevOut})
                    </p>
                  </div>
                )}
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
          onChange={e => onRamClearChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
          Notes (for this machine):
        </label>
        <div onClick={onDisabledFieldClick}>
          <Textarea
            placeholder="Machine-specific notes..."
            value={currentMachineNotes}
            onChange={e => onMachineNotesChange(e.target.value)}
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
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={onAddOrUpdateEntry}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              disabled={(!inputsEnabled && !editingEntryId) || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Update Entry in List'}
            </Button>
          </>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onAddEntry}
                  className={`w-full text-white ${
                    isAddMachineEnabled
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'cursor-not-allowed bg-gray-400'
                  }`}
                  disabled={!inputsEnabled || isProcessing || !isAddMachineEnabled}
                >
                  {isProcessing ? 'Processing...' : 'Add Machine to List'}
                </Button>
              </TooltipTrigger>
              {!isAddMachineEnabled && (
                <TooltipContent>
                  <p>
                    {!machineForDataEntry
                      ? 'Please select a machine'
                      : !currentMetersIn || !currentMetersOut
                        ? 'Please enter meters in and out'
                        : currentRamClear &&
                            (!currentRamClearMetersIn || !currentRamClearMetersOut)
                          ? 'Please enter RAM Clear meters when RAM Clear is checked'
                          : 'Please fill required fields'}
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

