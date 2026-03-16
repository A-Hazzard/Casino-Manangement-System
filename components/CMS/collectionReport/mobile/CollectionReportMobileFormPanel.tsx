'use client';

import CollectionReportFormMachineDataEntry from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineDataEntry';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

type MobileFormPanelProps = {
  isVisible: boolean;
  onBack: () => void;
  onViewCollectedList: () => void;

  // Machine data
  selectedMachineData: CollectionReportMachineSummary | null;
  editingEntryId: string | null;

  // Form data
  formData: {
    collectionTime: Date;
    metersIn: string;
    metersOut: string;
    ramClear: boolean;
    ramClearMetersIn: string;
    ramClearMetersOut: string;
    notes: string;
    sasStartTime: Date | null;
    sasEndTime: Date | null;
    showAdvancedSas: boolean;
  };

  // Financials
  financials: {
    taxes: string;
    advance: string;
    variance: string;
    varianceReason: string;
    amountToCollect: string;
    collectedAmount: string;
    balanceCorrection: string;
    balanceCorrectionReason: string;
    previousBalance: string;
    reasonForShortagePayment: string;
  };

  collectedMachinesCount: number;
  isProcessing: boolean;
  inputsEnabled: boolean;
  isAddMachineEnabled: boolean;

  // Callbacks
  formatMachineDisplay: (
    machine: CollectionReportMachineSummary
  ) => string | React.ReactElement;
  onViewMachine: () => void;
  onFormDataChange: (field: string, value: string | boolean | Date | null) => void;
  onFinancialDataChange: (field: string, value: string) => void;
  onAddMachine: () => void;

  // For RAM clear auto-fill
  autoFillRamClearMeters: (checked: boolean) => void;

  // For collected amount calculations
  onCollectedAmountChange: (value: string) => void;
  baseBalanceCorrection: string;
  onBaseBalanceCorrectionChange: (value: string) => void;
  isManager?: boolean;
};

/**
 * CollectionReportMobileFormPanel Component
 * Complete form panel for mobile collection modal
 */
export default function CollectionReportMobileFormPanel({
  isVisible,
  onBack,
  onViewCollectedList,
  selectedMachineData,
  editingEntryId,
  formData,
  financials: _financials,
  collectedMachinesCount,
  isProcessing,
  inputsEnabled,
  isAddMachineEnabled,
  formatMachineDisplay,
  onViewMachine,
  onFormDataChange,
  onFinancialDataChange: _onFinancialDataChange,
  onAddMachine,
  autoFillRamClearMeters,
  onCollectedAmountChange: _onCollectedAmountChange,
  baseBalanceCorrection: _baseBalanceCorrection,
  onBaseBalanceCorrectionChange: _onBaseBalanceCorrectionChange,
  isManager = false,
}: MobileFormPanelProps) {
  return (
    <div
      className={`fixed inset-0 z-[110] flex h-full w-full transform flex-col bg-white shadow-xl transition-all duration-300 ease-in-out md:relative md:inset-auto md:flex md:h-full md:flex-1 md:w-full md:rounded-xl md:shadow-none ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0'
      } `}
    >
      {isVisible && (
        <div className="flex h-full w-full flex-col overflow-hidden bg-white">
          {/* Form Header */}
          <div className="sticky top-0 z-[100] flex items-center justify-between border-b bg-white px-2 py-3 shadow-sm">
            <div className="flex items-center gap-1">
              <button
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:scale-95"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h3 className="text-lg font-bold text-gray-900">
                {isManager 
                  ? 'Financial Summary'
                  : editingEntryId
                    ? `Edit ${selectedMachineData?.name || 'Machine'}`
                    : selectedMachineData?.name || 'Machine'}
              </h3>
            </div>
            {!isManager && !editingEntryId && (
              <button
                onClick={onViewCollectedList}
                className="mr-2 flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
              >
                <span>List ({collectedMachinesCount})</span>
              </button>
            )}
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
            {/* Form Content */}
            {!isManager && (
              <CollectionReportFormMachineDataEntry
                machineName={
                  selectedMachineData
                    ? formatMachineDisplay(selectedMachineData)
                    : 'N/A'
                }
                smibId={
                  selectedMachineData?.relayId ||
                  selectedMachineData?.smbId ||
                  'N/A'
                }
                currentMetersIn={selectedMachineData?.collectionMeters?.metersIn}
                currentMetersOut={
                  selectedMachineData?.collectionMeters?.metersOut
                }
                onViewMachine={onViewMachine}
                collectionTime={formData.collectionTime}
                onCollectionTimeChange={date => {
                  if (date) onFormDataChange('collectionTime', date);
                }}
                metersIn={formData.metersIn}
                metersOut={formData.metersOut}
                ramClear={formData.ramClear}
                ramClearMetersIn={formData.ramClearMetersIn}
                ramClearMetersOut={formData.ramClearMetersOut}
                prevIn={selectedMachineData?.collectionMeters?.metersIn}
                prevOut={selectedMachineData?.collectionMeters?.metersOut}
                onMetersInChange={val => onFormDataChange('metersIn', val)}
                onMetersOutChange={val => onFormDataChange('metersOut', val)}
                onRamClearChange={autoFillRamClearMeters}
                onRamClearMetersInChange={val =>
                  onFormDataChange('ramClearMetersIn', val)
                }
                onRamClearMetersOutChange={val =>
                  onFormDataChange('ramClearMetersOut', val)
                }
                notes={formData.notes}
                onNotesChange={val => onFormDataChange('notes', val)}
                disabled={!inputsEnabled}
                isProcessing={isProcessing}
                showAdvancedSas={formData.showAdvancedSas}
                onAdvancedSasToggle={() => onFormDataChange('showAdvancedSas', !formData.showAdvancedSas)}
                sasStartTime={formData.sasStartTime}
                onSasStartTimeChange={val => onFormDataChange('sasStartTime', val || null)}
                sasEndTime={formData.sasEndTime}
                onSasEndTimeChange={val => onFormDataChange('sasEndTime', val || null)}
              />
            )}
          </div>

          {/* Form Footer */}
          <div className="sticky bottom-0 space-y-3 border-t bg-gray-50 p-4">
            {/* View Form Button - Show when there's at least 1 machine in collection */}
            {collectedMachinesCount > 0 && !isManager && !editingEntryId && (
              <button
                onClick={onViewCollectedList}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 active:scale-95"
              >
                View Form ({collectedMachinesCount} machine
                {collectedMachinesCount !== 1 ? 's' : ''})
              </button>
            )}

            {!isManager && (
              <button
                onClick={onAddMachine}
                disabled={isProcessing || !inputsEnabled || !isAddMachineEnabled}
                className={`w-full rounded-lg py-3 font-semibold transition-colors active:scale-95 ${
                  isAddMachineEnabled && inputsEnabled && !isProcessing
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'cursor-not-allowed bg-gray-400 text-gray-200'
                }`}
              >
                {isProcessing
                  ? editingEntryId
                    ? 'Updating...'
                    : 'Adding...'
                  : editingEntryId
                    ? 'Update Machine'
                    : 'Add Machine to List'}
              </button>
            )}
            
            {isManager && (
              <button
                onClick={onViewCollectedList}
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition-colors hover:bg-green-700 active:scale-95"
              >
                Finish Financial Editing
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

