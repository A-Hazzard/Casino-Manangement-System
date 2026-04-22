/**
 * Edit Collection Form Fields Component
 *
 * Handles collection time, meters input, RAM clear, and notes for the Edit Collection Modal.
 *
 * Features:
 * - Specific machine display with historical context
 * - Manual and automatic SAS time management
 * - Meters regression validation
 * - RAM Clear meter handling
 * - View machine history shortcut
 *
 * @param selectedLocationName - Name of the location the report belongs to
 * @param machineForDataEntry - Machine summary object for the machine being edited
 * @param currentCollectionTime - Currently selected collection timestamp
 * @param setCurrentCollectionTime - Setter for the collection timestamp
 * @param showAdvancedSas - Toggle state for manual SAS time period overrides
 * @param setShowAdvancedSas - Toggle setter for manual SAS times
 * @param sasStartTime - Manually overridden SAS start time
 * @param setSasStartTime - Setter for manual SAS start time
 * @param sasEndTime - Manually overridden SAS end time
 * @param setSasEndTime - Setter for manual SAS end time
 * @param currentMetersIn - Editable value for Meters In
 * @param setCurrentMetersIn - Setter for Meters In
 * @param currentMetersOut - Editable value for Meters Out
 * @param setCurrentMetersOut - Setter for Meters Out
 * @param currentRamClearMetersIn - Editable value for pre-reset Meters In
 * @param setCurrentRamClearMetersIn - Setter for RAM Clear Meters In
 * @param currentRamClearMetersOut - Editable value for pre-reset Meters Out
 * @param setCurrentRamClearMetersOut - Setter for RAM Clear Meters Out
 * @param currentMachineNotes - Custom notes for this individual machine entry
 * @param setCurrentMachineNotes - Setter for machine notes
 * @param currentRamClear - Whether RAM clear logic is active for this entry
 * @param setCurrentRamClear - Toggle for RAM clear state
 * @param prevIn - Historical Meters In value for reference
 * @param prevOut - Historical Meters Out value for reference
 * @param onPrevInChange - Callback for manual previous meter adjustments
 * @param onPrevOutChange - Callback for manual previous meter adjustments
 * @param debouncedCurrentMetersIn - Debounced meter in value for validation checks
 * @param debouncedCurrentMetersOut - Debounced meter out value for validation checks
 * @param inputsEnabled - Global editability flag for the form
 * @param isProcessing - Loading state for async submission/validation
 * @param editingEntryId - The unique ID of the machine entry being modified
 * @param isAddMachineEnabled - Validation flag for the update button state
 * @param onAddOrUpdateEntry - Save callback for the machine entry
 * @param onCancelEdit - Discard changes callback
 * @param onDisabledFieldClick - Informative callback for locked fields
 * @param onViewMachine - Navigation callback to view machine details
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { Input } from '@/components/shared/ui/input';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import { Textarea } from '@/components/shared/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { formatDate } from '@/lib/utils/formatting';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { ExternalLink } from 'lucide-react';

type EditCollectionFormFieldsProps = {
  selectedLocationName: string;
  machineForDataEntry: CollectionReportMachineSummary | undefined;
  currentCollectionTime: Date;
  setCurrentCollectionTime: (date: Date) => void;
  showAdvancedSas: boolean;
  setShowAdvancedSas: (show: boolean) => void;
  sasStartTime: Date | null;
  setSasStartTime: (date: Date | null) => void;
  sasEndTime: Date | null;
  setSasEndTime: (date: Date | null) => void;
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
  prevIn: string;
  prevOut: string;
  onPrevInChange: (val: string) => void;
  onPrevOutChange: (val: string) => void;

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

export default function CollectionReportEditFormFields({
  selectedLocationName,
  machineForDataEntry,
  currentCollectionTime,
  setCurrentCollectionTime,
  showAdvancedSas,
  setShowAdvancedSas,
  sasStartTime,
  setSasStartTime,
  sasEndTime,
  setSasEndTime,
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
  onPrevInChange,
  onPrevOutChange,
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

      <div className="flex w-full items-center justify-between rounded-md bg-lighterBlueHighlight px-4 py-2 text-primary-foreground">
        <span className="text-sm font-medium">
          {machineForDataEntry
            ? formatMachineDisplayNameWithBold({
                ...machineForDataEntry,
                serialNumber: getSerialNumberIdentifier(machineForDataEntry),
              })
            : 'Select a machine to edit'}
        </span>
        {machineForDataEntry && (
          <button
            type="button"
            className="ml-2 shrink-0 rounded p-0.5 transition-transform hover:scale-110 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onViewMachine();
            }}
            aria-label="View machine details"
            title="View machine details"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-4">
        <button
          type="button"
          className="text-xs text-button hover:underline flex items-center gap-1 font-medium"
          onClick={() => setShowAdvancedSas(!showAdvancedSas)}
        >
          {showAdvancedSas ? '← Hide Advanced Options' : 'Advanced: Manual SAS Times'}
        </button>
      </div>

      {!showAdvancedSas ? (
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
      ) : (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <p className="mb-4 text-[11px] font-bold text-blue-900 uppercase tracking-wide">
            Manual SAS Period:
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-2 block text-[13px] font-bold text-grayHighlight">
                Start Time:
              </label>
              <ModernCalendar
                date={
                  sasStartTime
                    ? {
                        from: sasStartTime,
                        to: sasStartTime,
                      }
                    : undefined
                }
                onSelect={range => {
                  setSasStartTime(range?.from || null);
                }}
                enableTimeInputs={true}
                mode="single"
                disabled={!inputsEnabled || isProcessing}
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-bold text-grayHighlight">
                End Time:
              </label>
              <ModernCalendar
                date={
                  sasEndTime
                    ? {
                        from: sasEndTime,
                        to: sasEndTime,
                      }
                    : undefined
                }
                onSelect={range => {
                  setSasEndTime(range?.from || null);
                }}
                enableTimeInputs={true}
                mode="single"
                disabled={!inputsEnabled || isProcessing}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-600 leading-relaxed italic">
            Note: Manually setting these times will override the automatic SAS period calculation based on collection time.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
            Meters In:
            <CalculationHelp 
              title="Meters In" 
              formula="Current In - Previous In" 
              description="Calculates the total credits or cash inserted into the machine since the last collection."
            />
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
          <p className="mt-1 text-xs text-grayHighlight font-medium">
            Prev In:
          </p>
          <div onClick={onDisabledFieldClick}>
            <Input
              type="text"
              placeholder="0"
              value={prevIn || ''}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '')
                  onPrevInChange(val);
              }}
              disabled={!inputsEnabled || isProcessing}
              className="h-7 text-xs"
            />
          </div>

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
          <label className="mb-1 flex items-center text-sm font-medium text-grayHighlight">
            Meters Out:
            <CalculationHelp 
              title="Meters Out" 
              formula="Current Out - Previous Out" 
              description="Calculates the total payouts or credits won by players since the last collection."
            />
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
          <p className="mt-1 text-xs text-grayHighlight font-medium">
            Prev Out:
          </p>
          <div onClick={onDisabledFieldClick}>
            <Input
              type="text"
              placeholder="0"
              value={prevOut || ''}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '')
                  onPrevOutChange(val);
              }}
              disabled={!inputsEnabled || isProcessing}
              className="h-7 text-xs"
            />
          </div>

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
          className="text-sm font-medium text-gray-700 flex items-center"
        >
          RAM Clear
          <CalculationHelp 
            title="RAM Clear" 
            formula="(RAM_Clear_Meters - Previous_Meters) + Current_Meters" 
            description="Used when machine meters are reset to zero. This formula ensures no data is lost during the reset."
          />
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

