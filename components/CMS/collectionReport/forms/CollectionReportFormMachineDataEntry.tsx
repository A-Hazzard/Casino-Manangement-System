'use client';

import { ReactElement } from 'react';
import CollectionReportFormMachineInfoDisplay from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineInfoDisplay';
import CollectionReportFormTimeInput from '@/components/CMS/collectionReport/forms/CollectionReportFormTimeInput';
import CollectionReportFormMachineMeters from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineMeters';
import CollectionReportFormMachineNotes from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineNotes';
import CollectionReportFormSharedFinancials from '@/components/CMS/collectionReport/forms/CollectionReportFormSharedFinancials';

type MachineDataEntryFormProps = {
  // Machine display data
  machineName?: string | ReactElement;
  smibId?: string;
  currentMetersIn?: number | null;
  currentMetersOut?: number | null;
  onViewMachine?: () => void;

  // Meters data
  metersIn: string;
  metersOut: string;
  ramClear: boolean;
  ramClearMetersIn?: string;
  ramClearMetersOut?: string;
  prevIn?: string | number | null;
  prevOut?: string | number | null;
  onPrevInChange?: (value: string) => void;
  onPrevOutChange?: (value: string) => void;
  onMetersInChange: (value: string) => void;
  onMetersOutChange: (value: string) => void;
  onRamClearChange: (checked: boolean) => void;
  onRamClearMetersInChange?: (value: string) => void;
  onRamClearMetersOutChange?: (value: string) => void;

  // Notes
  notes: string;
  onNotesChange: (notes: string) => void;

  // Shared financials (only shown for first machine)
  showFinancials?: boolean;
  taxes?: string;
  advance?: string;
  onTaxesChange?: (value: string) => void;
  onAdvanceChange?: (value: string) => void;

  // State
  disabled?: boolean;
  isProcessing?: boolean;

  // SAS times
  sasStartTime?: Date | string | null;
  onSasStartTimeChange?: (date: Date | null) => void;
  sasEndTime?: Date | string | null;
  onSasEndTimeChange?: (date: Date | null) => void;
  isLoadingTime?: boolean;
  isWow?: boolean;
  includeJackpot?: boolean;
  jackpot?: number;
  isOnline?: boolean;
  hasRelay?: boolean;
};

/**
 * CollectionReportFormMachineDataEntry Component
 * Complete form for entering machine collection data
 * Combines machine info, collection time, meters, notes, and optional financials
 */
export default function CollectionReportFormMachineDataEntry({
  machineName,
  smibId,
  currentMetersIn,
  currentMetersOut,
  onViewMachine,
  metersIn,
  metersOut,
  ramClear,
  ramClearMetersIn,
  ramClearMetersOut,
  prevIn,
  prevOut,
  onMetersInChange,
  onMetersOutChange,
  onRamClearChange,
  onRamClearMetersInChange,
  onRamClearMetersOutChange,
  notes,
  onNotesChange,
  showFinancials = false,
  taxes,
  advance,
  onTaxesChange,
  onAdvanceChange,
  disabled = false,
  isProcessing = false,
  sasStartTime = null,
  onSasStartTimeChange,
  sasEndTime = null,
  onSasEndTimeChange,
  onPrevInChange,
  onPrevOutChange,
  isLoadingTime = false,
  isWow = false,
  includeJackpot = false,
  jackpot = 0,
  isOnline,
  hasRelay,
}: MachineDataEntryFormProps) {
  // ============================================================================
  // Computed
  // ============================================================================
  const inputsEnabled = !disabled && !isProcessing;

  const parsedSasStartTime =
    sasStartTime instanceof Date
      ? sasStartTime
      : sasStartTime
        ? new Date(sasStartTime)
        : null;

  const parsedSasEndTime =
    sasEndTime instanceof Date
      ? sasEndTime
      : sasEndTime
        ? new Date(sasEndTime)
        : null;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {/* Machine Info Display */}
      <CollectionReportFormMachineInfoDisplay
        machineName={machineName}
        smibId={smibId}
        currentMetersIn={currentMetersIn}
        currentMetersOut={currentMetersOut}
        onViewMachine={onViewMachine}
        isOnline={isOnline}
        hasRelay={hasRelay}
      />

      {/* Collection Time */}
      <div className="mb-2 space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-blue-900">
          Collection Time
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">
              Start Time
            </label>
            <CollectionReportFormTimeInput
              date={parsedSasStartTime ?? new Date()}
              onDateChange={date => onSasStartTimeChange?.(date || null)}
              disabled={isProcessing}
              showHelpText={false}
              maxDate={parsedSasEndTime ?? new Date()}
              isLoadingTime={isLoadingTime}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">
              End Time
            </label>
            <CollectionReportFormTimeInput
              date={parsedSasEndTime ?? new Date()}
              onDateChange={date => onSasEndTimeChange?.(date || null)}
              disabled={isProcessing}
              showHelpText={false}
              minDate={parsedSasStartTime ?? undefined}
              isLoadingTime={isLoadingTime}
            />
          </div>
        </div>
        <p className="px-2 text-center text-[10px] italic leading-relaxed text-blue-600">
          Start time is automatically set from the previous collection time.
        </p>
      </div>

      {/* Meter Inputs */}
      <CollectionReportFormMachineMeters
        metersIn={metersIn}
        metersOut={metersOut}
        ramClear={ramClear}
        ramClearMetersIn={ramClearMetersIn}
        ramClearMetersOut={ramClearMetersOut}
        prevIn={prevIn}
        prevOut={prevOut}
        onMetersInChange={onMetersInChange}
        onMetersOutChange={onMetersOutChange}
        onRamClearChange={onRamClearChange}
        onRamClearMetersInChange={onRamClearMetersInChange}
        onRamClearMetersOutChange={onRamClearMetersOutChange}
        onPrevInChange={onPrevInChange}
        onPrevOutChange={onPrevOutChange}
        disabled={!inputsEnabled}
        isWow={isWow}
        includeJackpot={includeJackpot}
        jackpot={jackpot}
      />

      {/* Notes */}
      <CollectionReportFormMachineNotes
        notes={notes}
        onNotesChange={onNotesChange}
        disabled={!inputsEnabled}
      />

      {/* Financial Data (only for first machine) */}
      {showFinancials &&
        taxes !== undefined &&
        advance !== undefined &&
        onTaxesChange &&
        onAdvanceChange && (
          <div className="border-t pt-4">
            <CollectionReportFormSharedFinancials
              taxes={taxes}
              advance={advance}
              onTaxesChange={onTaxesChange}
              onAdvanceChange={onAdvanceChange}
              disabled={isProcessing}
            />
          </div>
        )}
    </div>
  );
}
