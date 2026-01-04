'use client';

import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { ArrowLeft } from 'lucide-react';
import React from 'react';
import CollectionReportFormMachineDataEntry from '@/components/collectionReport/forms/CollectionReportFormMachineDataEntry';

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
  onFormDataChange: (field: string, value: string | boolean | Date) => void;
  onFinancialDataChange: (field: string, value: string) => void;
  onAddMachine: () => void;

  // For RAM clear auto-fill
  autoFillRamClearMeters: (checked: boolean) => void;

  // For collected amount calculations
  onCollectedAmountChange: (value: string) => void;
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
  financials,
  collectedMachinesCount,
  isProcessing,
  inputsEnabled,
  isAddMachineEnabled,
  formatMachineDisplay,
  onViewMachine,
  onFormDataChange,
  onFinancialDataChange,
  onAddMachine,
  autoFillRamClearMeters,
  onCollectedAmountChange,
}: MobileFormPanelProps) {
  return (
    <div
      className={`fixed z-[90] h-full w-full transform bg-white transition-all duration-300 ease-in-out md:h-[90vh] md:rounded-xl ${
        isVisible
          ? 'inset-0 translate-y-0 opacity-100 md:inset-auto md:left-[50%] md:top-[50%] md:-translate-x-1/2 md:-translate-y-1/2'
          : 'pointer-events-none inset-0 translate-y-full opacity-0 md:inset-auto md:left-[50%] md:top-[50%] md:-translate-x-1/2 md:-translate-y-1/2 md:translate-y-[-50%]'
      } `}
    >
      {isVisible && (
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* Form Header */}
          <div className="flex items-center justify-between border-b bg-blue-600 p-4 text-white">
            <button
              onClick={onBack}
              className="rounded-full p-2 hover:bg-blue-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold">
              {editingEntryId
                ? `Edit ${selectedMachineData?.name || 'Machine'}`
                : selectedMachineData?.name || 'Machine'}
            </h3>
            <button
              onClick={onViewCollectedList}
              className="rounded-full p-2 hover:bg-blue-700"
            >
              <span className="text-sm">List ({collectedMachinesCount})</span>
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Form Content */}
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
              showFinancials={collectedMachinesCount === 0}
              taxes={financials.taxes}
              advance={financials.advance}
              onTaxesChange={val => onFinancialDataChange('taxes', val)}
              onAdvanceChange={val => onFinancialDataChange('advance', val)}
              disabled={!inputsEnabled}
              isProcessing={isProcessing}
            />

            {/* Additional Financial Fields (only for first machine) */}
            {collectedMachinesCount === 0 && (
              <div className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Variance */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Variance
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={financials.variance}
                      onChange={e => {
                        if (
                          /^-?\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === ''
                        ) {
                          onFinancialDataChange('variance', e.target.value);
                        }
                      }}
                      disabled={isProcessing}
                      className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Variance Reason */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Variance Reason
                    </label>
                    <textarea
                      placeholder="Variance Reason"
                      value={financials.varianceReason}
                      onChange={e =>
                        onFinancialDataChange('varianceReason', e.target.value)
                      }
                      className="min-h-[80px] w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Amount To Collect */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Amount To Collect: <span className="text-red-500">*</span>{' '}
                      <span className="text-xs text-gray-400">
                        (Auto-calculated)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={financials.amountToCollect}
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border bg-gray-100 p-3"
                      title="This value is automatically calculated"
                    />
                  </div>

                  {/* Collected Amount */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Collected Amount
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={financials.collectedAmount}
                      onChange={e => onCollectedAmountChange(e.target.value)}
                      disabled={
                        isProcessing ||
                        financials.balanceCorrection.trim() === ''
                      }
                      className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {financials.balanceCorrection.trim() === '' && (
                      <p className="mt-1 text-xs text-gray-500">
                        Enter a Balance Correction first, then the Collected
                        Amount will unlock.
                      </p>
                    )}
                  </div>

                  {/* Balance Correction */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Balance Correction:{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={financials.balanceCorrection}
                      onChange={e => {
                        if (
                          /^-?\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === ''
                        ) {
                          onFinancialDataChange(
                            'balanceCorrection',
                            e.target.value
                          );
                        }
                      }}
                      className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Balance correction amount (editable)"
                      disabled={
                        isProcessing || financials.collectedAmount.trim() !== ''
                      }
                    />
                    {financials.collectedAmount.trim() !== '' && (
                      <p className="mt-1 text-xs text-gray-500">
                        Clear the Collected Amount to edit the Balance
                        Correction.
                      </p>
                    )}
                  </div>

                  {/* Balance Correction Reason */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Balance Correction Reason
                    </label>
                    <textarea
                      placeholder="Correction Reason"
                      value={financials.balanceCorrectionReason}
                      onChange={e =>
                        onFinancialDataChange(
                          'balanceCorrectionReason',
                          e.target.value
                        )
                      }
                      className="min-h-[80px] w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Previous Balance */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Previous Balance:{' '}
                      <span className="text-xs text-gray-400">
                        (Auto-calculated: collected amount - amount to collect)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={financials.previousBalance}
                      onChange={e =>
                        onFinancialDataChange('previousBalance', e.target.value)
                      }
                      className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Auto-calculated as collected amount minus amount to collect (editable)"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Reason For Shortage Payment */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Reason For Shortage Payment
                    </label>
                    <textarea
                      placeholder="Shortage Reason"
                      value={financials.reasonForShortagePayment}
                      onChange={e =>
                        onFinancialDataChange(
                          'reasonForShortagePayment',
                          e.target.value
                        )
                      }
                      className="min-h-[80px] w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Footer */}
          <div className="space-y-3 border-t bg-gray-50 p-4">
            {/* View Form Button - Show when there's at least 1 machine in collection */}
            {collectedMachinesCount > 0 && (
              <button
                onClick={onViewCollectedList}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                View Form ({collectedMachinesCount} machine
                {collectedMachinesCount !== 1 ? 's' : ''})
              </button>
            )}

            <button
              onClick={onAddMachine}
              disabled={isProcessing || !inputsEnabled || !isAddMachineEnabled}
              className={`w-full rounded-lg py-3 font-semibold transition-colors ${
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
          </div>
        </div>
      )}
    </div>
  );
};
