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

  // Collection time
  collectionTime: Date;
  onCollectionTimeChange: (date: Date | undefined) => void;

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

  // SAS manual overrides
  showAdvancedSas?: boolean;
  onAdvancedSasToggle?: () => void;
  sasStartTime?: Date | null;
  onSasStartTimeChange?: (date: Date | null) => void;
  sasEndTime?: Date | null;
  onSasEndTimeChange?: (date: Date | null) => void;
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
  collectionTime,
  onCollectionTimeChange,
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
  showAdvancedSas = false,
  onAdvancedSasToggle,
  sasStartTime = null,
  onSasStartTimeChange,
  sasEndTime = null,
  onSasEndTimeChange,
  onPrevInChange,
  onPrevOutChange,
}: MachineDataEntryFormProps) {
  const inputsEnabled = !disabled && !isProcessing;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {/* Machine Info Display */}
      <CollectionReportFormMachineInfoDisplay
        machineName={machineName}
        smibId={smibId}
        currentMetersIn={currentMetersIn}
        currentMetersOut={currentMetersOut}
        onViewMachine={onViewMachine}
      />

      {/* Advanced SAS Overrides Toggle */}
      <div className="mb-2">
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold bg-blue-50 px-3 py-2 rounded-lg w-full justify-center border border-blue-100"
          onClick={onAdvancedSasToggle}
        >
          {showAdvancedSas ? '← Hide Manual SAS Options' : 'Advanced: Manual SAS Times'}
        </button>
      </div>

      {!showAdvancedSas ? (
        <CollectionReportFormTimeInput
          date={collectionTime}
          onDateChange={onCollectionTimeChange}
          disabled={isProcessing}
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest text-center">
            Manual SAS Reporting Period
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">
                SAS Start Time
              </label>
              <CollectionReportFormTimeInput
                date={
                  sasStartTime && !isNaN(new Date(sasStartTime).getTime())
                    ? new Date(sasStartTime)
                    : new Date()
                }
                onDateChange={date => onSasStartTimeChange?.(date || null)}
                disabled={isProcessing}
                showHelpText={false}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">
                SAS End Time
              </label>
              <CollectionReportFormTimeInput
                date={
                  sasEndTime && !isNaN(new Date(sasEndTime).getTime())
                    ? new Date(sasEndTime)
                    : new Date()
                }
                onDateChange={date => onSasEndTimeChange?.(date || null)}
                disabled={isProcessing}
                showHelpText={false}
              />
            </div>
          </div>
          
          <p className="text-[10px] text-blue-600 italic leading-relaxed text-center px-2">
            * Overrides automatic calculation based on collection time.
          </p>
        </div>
      )}

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
      />

      {/* Notes */}
      <CollectionReportFormMachineNotes
        notes={notes}
        onNotesChange={onNotesChange}
        disabled={!inputsEnabled}
      />

      {/* Financial Data (only for first machine) */}
      {showFinancials && taxes !== undefined && advance !== undefined && onTaxesChange && onAdvanceChange && (
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


