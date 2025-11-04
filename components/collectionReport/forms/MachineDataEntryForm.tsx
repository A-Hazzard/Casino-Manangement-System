'use client';

import React from 'react';
import { MachineInfoDisplay } from './MachineInfoDisplay';
import { CollectionTimeInput } from './CollectionTimeInput';
import { MachineMetersForm } from './MachineMetersForm';
import { MachineNotesInput } from './MachineNotesInput';
import { SharedFinancialsForm } from './SharedFinancialsForm';

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
 * MachineDataEntryForm Component
 * Complete form for entering machine collection data
 * Combines machine info, collection time, meters, notes, and optional financials
 */
export const MachineDataEntryForm: React.FC<MachineDataEntryFormProps> = ({
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
}) => {
  const inputsEnabled = !disabled && !isProcessing;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {/* Machine Info Display */}
      <MachineInfoDisplay
        machineName={machineName}
        smibId={smibId}
        currentMetersIn={currentMetersIn}
        currentMetersOut={currentMetersOut}
        onViewMachine={onViewMachine}
      />

      {/* Collection Time */}
      <CollectionTimeInput
        date={collectionTime}
        onDateChange={onCollectionTimeChange}
        disabled={isProcessing}
      />

      {/* Meter Inputs */}
      <MachineMetersForm
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
      <MachineNotesInput
        notes={notes}
        onNotesChange={onNotesChange}
        disabled={!inputsEnabled}
      />

      {/* Financial Data (only for first machine) */}
      {showFinancials && taxes !== undefined && advance !== undefined && onTaxesChange && onAdvanceChange && (
        <div className="border-t pt-4">
          <SharedFinancialsForm
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
};

