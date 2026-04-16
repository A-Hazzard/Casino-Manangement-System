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
  currentCollectionTime: Date;
  showAdvancedSas: boolean;
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
  onCollectionTimeChange: (date: Date) => void;
  onAdvancedSasToggle: () => void;
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
};

export default function CollectionReportNewCollectionFormFields({
  selectedLocationName,
  currentCollectionTime,
  previousCollectionTime,
  machineForDataEntry,
  showAdvancedSas,
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
  onCollectionTimeChange,
  onAdvancedSasToggle,
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
}: NewCollectionFormFieldsProps) {
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
        <span className="text-sm font-medium">
          {machineForDataEntry
            ? formatMachineDisplayNameWithBold(machineForDataEntry)
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
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced SAS Time Override Toggle */}
      <div className="mb-4">
        <button
          type="button"
          className="text-xs text-button hover:underline flex items-center gap-1 font-medium"
          onClick={onAdvancedSasToggle}
        >
          {showAdvancedSas ? '← Hide Advanced Options' : 'Advanced: Manual SAS Times'}
        </button>
      </div>

      {/* Collection Time Picker (simple) / Manual SAS Period Inputs (advanced) */}
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
                  onSasStartTimeChange(range?.from || null);
                }}
                enableTimeInputs={true}
                mode="single"
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
                  onSasEndTimeChange(range?.from || null);
                }}
                enableTimeInputs={true}
                mode="single"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-600 leading-relaxed italic">
            Note: Manually setting these times will override the automatic SAS period calculation based on collection time.
          </p>
        </div>
      )}

      {/* Meters In / Out Inputs with Previous Meter Reference */}
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
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onPrevInChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
              className="h-7 text-xs"
            />
          </div>

          {/* Meters In regression warning — shown after debounce */}
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
                if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                  onPrevOutChange(val);
                }
              }}
              disabled={!inputsEnabled || isProcessing}
              className="h-7 text-xs"
            />
          </div>

          {/* Meters Out regression warning — shown after debounce */}
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

      {/* RAM Clear Pre-Reset Meters — only visible when RAM Clear is checked */}
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
              {/* RAM Clear Meters In upper-bound warning — shown after debounce */}
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
              {/* RAM Clear Meters Out upper-bound warning — shown after debounce */}
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
