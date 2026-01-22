'use client';

import React from 'react';
import CollectionReportFormMachineInfoDisplay from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineInfoDisplay';
import CollectionReportFormTimeInput from '@/components/CMS/collectionReport/forms/CollectionReportFormTimeInput';
import CollectionReportFormMachineMeters from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineMeters';
import CollectionReportFormMachineNotes from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineNotes';
import CollectionReportFormSharedFinancials from '@/components/CMS/collectionReport/forms/CollectionReportFormSharedFinancials';

type MachineDataEntryFormProps = {
  // Machine display data
  machineName?: string | React.ReactElement;
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
  prevIn?: number | null;
  prevOut?: number | null;
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

      {/* Collection Time */}
      <CollectionReportFormTimeInput
        date={collectionTime}
        onDateChange={onCollectionTimeChange}
        disabled={isProcessing}
      />

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


