/**
 * New Collection Form Fields Component
 *
 * Handles collection time, meters input, RAM clear, and notes for the New Collection Modal.
 *
 * Features:
 * - Collection time picker
 * - Meters In/Out inputs with validation
 * - RAM Clear checkbox and meters
 * - Advanced SAS start override
 * - Machine notes
 * - Add/Update entry buttons
 *
 * @param selectedLocationName - Name of the location selected for collection
 * @param previousCollectionTime - Date of the last collection for the selected machine
 * @param machineForDataEntry - Currently selected machine object for data entry
 * @param currentCollectionTime - Date object representing the current collection time
 * @param showAdvancedSas - Toggle state for manual SAS time overrides
 * @param sasStartTime - Manual start time for SAS period
 * @param sasEndTime - Manual end time for SAS period
 * @param currentMetersIn - Current Meters In value as a string
 * @param currentMetersOut - Current Meters Out value as a string
 * @param currentRamClearMetersIn - RAM Clear Meters In value as a string
 * @param currentRamClearMetersOut - RAM Clear Meters Out value as a string
 * @param currentMachineNotes - Custom notes for the current machine entry
 * @param currentRamClear - Whether RAM clear is enabled for this machine
 * @param prevIn - Previous Meters In value from the last report
 * @param prevOut - Previous Meters Out value from the last report
 * @param inputsEnabled - Whether form inputs are in an editable state
 * @param isProcessing - Loading state for async operations
 * @param editingEntryId - ID of the entry currently being edited in the batch
 * @param isAddMachineEnabled - Whether the machine can currently be added to the list
 * @param onCollectionTimeChange - Callback for collection time updates
 * @param onAdvancedSasToggle - Callback for advanced options toggle
 * @param onSasStartTimeChange - Callback for SAS start time updates
 * @param onSasEndTimeChange - Callback for SAS end time updates
 * @param onMetersInChange - Callback for Meters In value updates
 * @param onMetersOutChange - Callback for Meters Out value updates
 * @param onRamClearMetersInChange - Callback for RAM Clear meters updates
 * @param onRamClearMetersOutChange - Callback for RAM Clear meters updates
 * @param onMachineNotesChange - Callback for notes updates
 * @param onRamClearChange - Callback for RAM Clear checkbox updates
 * @param onDisabledFieldClick - Callback when a disabled field is interacted with
 * @param onAddEntry - Callback to add a new machine to the batch
 * @param onCancelEdit - Callback to cancel an existing edit session
 * @param onAddOrUpdateEntry - Callback to save changes to the current entry
 * @param onPrevInChange - Callback for manual previous in override
 * @param onPrevOutChange - Callback for manual previous out override
 * @param onViewMachine - Callback to view detailed machine history
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { Input } from '@/components/shared/ui/input';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import MachineOnlineStatusDot from '@/components/ui/MachineOnlineStatusDot';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import { formatDate } from '@/lib/utils/formatting';
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
  sasStartTime: Date | null;
  sasEndTime: Date | null;
  currentMetersIn: string;
  currentMetersOut: string;
  currentRamClearMetersIn: string;
  currentRamClearMetersOut: string;
  currentMachineNotes: string;
  currentRamClear: boolean;
  prevIn: string;
  prevOut: string;
  debouncedCurrentMetersIn: string;
  debouncedCurrentMetersOut: string;
  debouncedCurrentRamClearMetersIn: string;
  debouncedCurrentRamClearMetersOut: string;
  inputsEnabled: boolean;
  isProcessing: boolean;
  editingEntryId: string | null;
  isAddMachineEnabled: boolean;
  isMiddleReportWarning: boolean;
  onSasStartTimeChange: (date: Date | null) => void;
  onSasEndTimeChange: (date: Date | null) => void;
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
  onPrevInChange: (val: string) => void;
  onPrevOutChange: (val: string) => void;
  onViewMachine: () => void;
  isLoadingTime?: boolean;
  isWow?: boolean;
  includeJackpot?: boolean;
  jackpot?: number;
  machineIsOnline?: boolean;
  machineHasRelay?: boolean;
};

export default function CollectionReportNewCollectionFormFields({
  selectedLocationName,
  previousCollectionTime,
  machineForDataEntry,
  sasStartTime,
  sasEndTime,
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
  isMiddleReportWarning,
  onSasStartTimeChange,
  onSasEndTimeChange,
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
  onPrevInChange,
  onPrevOutChange,
  onViewMachine,
  isLoadingTime = false,
  isWow = false,
  includeJackpot = false,
  jackpot = 0,
  machineIsOnline,
  machineHasRelay,
}: NewCollectionFormFieldsProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Location Info & Previous Collection Banner */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-grayHighlight">
          {selectedLocationName} (Prev. Collection:{' '}
          {previousCollectionTime ? formatDate(previousCollectionTime) : 'N/A'})
        </p>
      </div>

      {/* Selected Machine Display & Quick-View Link */}
      <div className="flex w-full items-center justify-between rounded-md bg-lighterBlueHighlight px-4 py-2 text-primary-foreground">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">
            {machineForDataEntry
              ? formatMachineDisplayNameWithBold(machineForDataEntry)
              : 'Select a machine to edit'}
          </span>
          {machineForDataEntry && (
            <MachineOnlineStatusDot
              isOnline={machineIsOnline}
              hasRelay={machineHasRelay}
            />
          )}
        </div>
        {machineForDataEntry && (
          <button
            type="button"
            className="ml-2 shrink-0 rounded p-0.5 transition-transform hover:scale-110 hover:bg-white/20"
            onClick={e => {
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

      {/* Collection Time */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-blue-900">
          Collection Time
        </p>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-2 block text-[13px] font-bold text-grayHighlight">
              Start Time:
            </label>
            {isLoadingTime ? (
              <div className="h-10 w-full animate-pulse rounded-md border border-gray-200 bg-gray-200/50" />
            ) : (
              <ModernCalendar
                date={
                  inputsEnabled && sasStartTime
                    ? { from: sasStartTime, to: sasStartTime }
                    : undefined
                }
                onSelect={range => {
                  onSasStartTimeChange(range?.from || null);
                }}
                enableTimeInputs={true}
                mode="single"
                disabled={!inputsEnabled || isProcessing}
                maxDate={sasEndTime || new Date()}
              />
            )}
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-bold text-grayHighlight">
              End Time:
            </label>
            {isLoadingTime ? (
              <div className="h-10 w-full animate-pulse rounded-md border border-gray-200 bg-gray-200/50" />
            ) : (
              <ModernCalendar
                date={
                  inputsEnabled && sasEndTime
                    ? { from: sasEndTime, to: sasEndTime }
                    : undefined
                }
                onSelect={range => {
                  onSasEndTimeChange(range?.from || null);
                }}
                enableTimeInputs={true}
                mode="single"
                disabled={!inputsEnabled || isProcessing}
                maxDate={new Date()}
                minDate={sasStartTime || undefined}
              />
            )}
          </div>
        </div>
        {inputsEnabled &&
          sasStartTime &&
          sasEndTime &&
          sasStartTime > sasEndTime && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2">
              <p className="text-xs text-red-600">
                ⚠️ Start time cannot be after end time. Start:{' '}
                {sasStartTime.toLocaleString()}, End:{' '}
                {sasEndTime.toLocaleString()}
              </p>
            </div>
          )}
        <p className="mt-3 text-xs italic leading-relaxed text-blue-600">
          Start time is automatically set from the previous collection time.
        </p>
      </div>

      {/* Meters In / Out — read-only view for WOW machines (synced, not entered) */}
      {isWow ? (
        <div className="rounded-md border border-purple-200 bg-purple-50/60 p-3">
          <p className="mb-2 text-xs font-medium italic text-purple-700">
            WOW machine — meters are synced automatically and cannot be edited.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-sm font-medium text-grayHighlight">
                Meter In:
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {currentMetersIn !== '' && currentMetersIn != null
                  ? Number(currentMetersIn).toLocaleString()
                  : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-sm font-medium text-grayHighlight">
                Meter Out:
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {currentMetersOut !== '' && currentMetersOut != null
                  ? Number(currentMetersOut).toLocaleString()
                  : '--'}
              </span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-xs font-medium text-grayHighlight">
                Prev In:
              </span>
              <span className="text-xs font-semibold text-gray-600">
                {prevIn !== '' && prevIn != null
                  ? Number(prevIn).toLocaleString()
                  : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
              <span className="text-xs font-medium text-grayHighlight">
                Prev Out:
              </span>
              <span className="text-xs font-semibold text-gray-600">
                {prevOut !== '' && prevOut != null
                  ? Number(prevOut).toLocaleString()
                  : '--'}
              </span>
            </div>
          </div>
          {includeJackpot && jackpot > 0 && (
            <div className="mt-2 rounded border border-purple-100 bg-purple-50 p-2.5 text-[10px] leading-normal text-purple-700">
              <p className="mb-0.5 font-bold">
                ✨ Jackpot Included (+{Number(jackpot).toLocaleString()})
              </p>
              <p>
                Base Meter Out:{' '}
                <strong>
                  {currentMetersOut && Number(currentMetersOut) > jackpot
                    ? (Number(currentMetersOut) - jackpot).toLocaleString()
                    : '--'}
                </strong>
                {' · '}Jackpot: <strong>+{Number(jackpot).toLocaleString()}</strong>
                {' · '}Total:{' '}
                <strong>
                  {currentMetersOut
                    ? Number(currentMetersOut).toLocaleString()
                    : '--'}
                </strong>
              </p>
            </div>
          )}
        </div>
      ) : (
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
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onMetersInChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
            />
          </div>
          <p className="mt-1 text-xs font-medium text-grayHighlight">
            Prev In:
          </p>
          <div onClick={onDisabledFieldClick}>
            <Input
              type="text"
              placeholder="0"
              value={prevIn || ''}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onPrevInChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
              className="h-7 text-xs"
            />
          </div>

          {/* Meters In regression warning — suppressed when RAM clear is active */}
          {!currentRamClear &&
            debouncedCurrentMetersIn &&
            prevIn &&
            Number(debouncedCurrentMetersIn) < Number(prevIn) && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: Meters In ({debouncedCurrentMetersIn}) should be
                  higher than or equal to Previous Meters In ({prevIn})
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
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onMetersOutChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
            />
          </div>
          <p className="mt-1 text-xs font-medium text-grayHighlight">
            Prev Out:
          </p>
          <div onClick={onDisabledFieldClick}>
            <Input
              type="text"
              placeholder="0"
              value={prevOut || ''}
              onChange={e => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onPrevOutChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
              className="h-7 text-xs"
            />
          </div>

          {/* Meters Out regression warning — suppressed when RAM clear is active */}
          {!currentRamClear &&
            debouncedCurrentMetersOut &&
            prevOut &&
            Number(debouncedCurrentMetersOut) < Number(prevOut) && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-600">
                  Warning: Meters Out ({debouncedCurrentMetersOut}) should be
                  higher than or equal to Previous Meters Out ({prevOut})
                </p>
              </div>
            )}
          {includeJackpot && jackpot > 0 && (
            <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 p-2.5 text-xs text-purple-800 space-y-1 leading-normal">
              <div className="flex items-center gap-1 font-bold">
                <span>✨ Jackpot Included (+{Number(jackpot).toLocaleString()})</span>
              </div>
              <p className="text-[10px] text-purple-700 leading-normal">
                Base Meter Out: <strong>{currentMetersOut && Number(currentMetersOut) > jackpot ? (Number(currentMetersOut) - jackpot).toLocaleString() : '--'}</strong><br />
                Jackpot Amount: <strong>+{Number(jackpot).toLocaleString()}</strong><br />
                Total (Included): <strong>{currentMetersOut ? Number(currentMetersOut).toLocaleString() : '--'}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* RAM Clear Pre-Reset Meters — only visible when RAM Clear is checked.
          Hidden for WOW machines (no manual meter entry). */}
      {!isWow && currentRamClear && (
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
                  Number(debouncedCurrentRamClearMetersIn) < Number(prevIn)
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {/* RAM Clear Meters In must be >= previous meters In */}
              {currentRamClearMetersIn &&
                prevIn &&
                Number(currentRamClearMetersIn) < Number(prevIn) && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                    <p className="text-xs text-red-600">
                      ⚠️ RAM Clear Meters In ({currentRamClearMetersIn}) must be
                      ≥ Previous Meters In ({prevIn})
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
                  Number(debouncedCurrentRamClearMetersOut) < Number(prevOut)
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {/* RAM Clear Meters Out must be >= previous meters Out */}
              {currentRamClearMetersOut &&
                prevOut &&
                Number(currentRamClearMetersOut) < Number(prevOut) && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                    <p className="text-xs text-red-600">
                      ⚠️ RAM Clear Meters Out ({currentRamClearMetersOut}) must
                      be ≥ Previous Meters Out ({prevOut})
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* RAM Clear Toggle Checkbox */}
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
          className="flex items-center text-sm font-medium text-gray-700"
        >
          RAM Clear
          <CalculationHelp
            title="RAM Clear"
            formula="(RAM_Clear_Meters - Previous_Meters) + Current_Meters"
            description="Used when machine meters are reset to zero. This formula ensures no data is lost during the reset."
          />
        </label>
      </div>

      {/* Machine-Specific Notes */}
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

      {/* Middle-Date Block Warning */}
      {isMiddleReportWarning && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 shadow-sm">
          <p className="flex items-center text-sm font-semibold text-red-700">
            <span className="mr-2">⚠️</span> Cannot add machine
          </p>
          <p className="mt-1 text-xs text-red-600">
            The selected collection time falls between existing reports.
            Middle-date collections are not allowed.
          </p>
        </div>
      )}

      {/* Add / Update Entry Actions */}
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
              disabled={
                (!inputsEnabled && !editingEntryId) ||
                isProcessing ||
                isMiddleReportWarning ||
                (inputsEnabled &&
                  !!sasStartTime &&
                  !!sasEndTime &&
                  sasStartTime > sasEndTime)
              }
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
                  disabled={
                    !inputsEnabled ||
                    isProcessing ||
                    !isAddMachineEnabled ||
                    (inputsEnabled &&
                      !!sasStartTime &&
                      !!sasEndTime &&
                      sasStartTime > sasEndTime)
                  }
                >
                  {isProcessing ? 'Processing...' : 'Add Machine to List'}
                </Button>
              </TooltipTrigger>
              {!isAddMachineEnabled && (
                <TooltipContent>
                  <p>
                    {isMiddleReportWarning
                      ? 'Middle-date collections are not allowed'
                      : !machineForDataEntry
                        ? 'Please select a machine'
                        : !currentMetersIn || !currentMetersOut
                          ? 'Please enter meters in and out'
                          : currentRamClear &&
                              (!currentRamClearMetersIn ||
                                !currentRamClearMetersOut)
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
