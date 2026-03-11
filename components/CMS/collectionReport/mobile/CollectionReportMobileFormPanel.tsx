'use client';

import CollectionReportFormMachineDataEntry from '@/components/CMS/collectionReport/forms/CollectionReportFormMachineDataEntry';
import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { ArrowLeft, Info } from 'lucide-react';
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
  baseBalanceCorrection: _baseBalanceCorrection,
  onBaseBalanceCorrectionChange,
  isManager = false,
}: MobileFormPanelProps) {
  return (
    <div
      className={`fixed inset-0 z-[90] flex h-full w-full transform flex-col bg-white transition-all duration-300 ease-in-out md:h-[90vh] md:rounded-xl ${
        isVisible
          ? 'translate-y-0 opacity-100 md:left-[50%] md:top-[50%] md:-translate-x-1/2 md:-translate-y-1/2'
          : 'translate-y-full opacity-0 md:left-[50%] md:top-[50%] md:-translate-x-1/2 md:-translate-y-1/2'
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
            {!isManager && (
              <button
                onClick={onViewCollectedList}
                className="mr-2 flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
              >
                <span>List ({collectedMachinesCount})</span>
              </button>
            )}
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto">
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
                showFinancials={collectedMachinesCount === 0}
                taxes={financials.taxes}
                advance={financials.advance}
                onTaxesChange={val => onFinancialDataChange('taxes', val)}
                onAdvanceChange={val => onFinancialDataChange('advance', val)}
                disabled={!inputsEnabled}
                isProcessing={isProcessing}
              />
            )}

            {/* Additional Financial Fields (only for first machine or if manager) */}
            {(collectedMachinesCount === 0 || isManager) && (
              <div className="px-4 pb-4">
                {isManager && (
                   <div className="mb-6 pt-4">
                     <h3 className="text-base font-semibold mb-3">
                       Shared Financials for Batch
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="flex items-center text-sm font-medium mb-1">
                           Taxes
                           <CalculationHelp 
                             title="Taxes" 
                             formula="Value entered manually" 
                             description="Government taxes applied to the profit share."
                           />
                         </label>
                         <input
                           type="text"
                           placeholder="0"
                           value={financials.taxes}
                           onChange={(e) => onFinancialDataChange('taxes', e.target.value)}
                           disabled={isProcessing}
                           className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         />
                       </div>
                       <div>
                         <label className="flex items-center text-sm font-medium mb-1">
                           Advance
                           <CalculationHelp 
                             title="Advance" 
                             formula="Value entered manually" 
                             description="Upfront payment or loan provided to the partner."
                           />
                         </label>
                         <input
                           type="text"
                           placeholder="0"
                           value={financials.advance}
                           onChange={(e) => onFinancialDataChange('advance', e.target.value)}
                           disabled={isProcessing}
                           className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         />
                       </div>
                     </div>
                   </div>
                )}
                <div className="space-y-4">
                  {/* Variance */}
                  <div>
                     <label className="mb-1 flex items-center text-sm font-medium">
                       Variance
                       <CalculationHelp 
                         title="Variance" 
                         formula="Value entered manually" 
                         description="Expected vs actual money difference."
                       />
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
                     <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                       Amount To Collect: <span className="text-red-500 ml-1">*</span>
                       <CalculationHelp 
                         title="Amount to Collect" 
                         formula="(Total Meters In - Total Meters Out) - Variance - Advance - Partner Share + Opening Balance" 
                         description="This is the target amount of cash you should have in hand. It takes the total machine revenue and subtracts expenses (Advance/Variance) and the Partner's profit share, then adds any balance carried over from the last collection."
                       />
                     </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={financials.amountToCollect}
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border bg-gray-50 p-3 font-semibold text-gray-900"
                      title="This value is automatically calculated"
                    />
                    <p className="mt-1 text-[10px] text-gray-500">
                      Calculated automatically based on meters and location share settings.
                    </p>
                  </div>

                  {/* Collected Amount */}
                  <div>
                     <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                       Collected Amount
                       <CalculationHelp 
                         title="Collected Amount" 
                         formula="The actual physical cash you counted" 
                         description="This is the most important field. Enter the total amount of cash you actually retrieved and counted from all machines. This should ideally match the 'Amount to Collect' field."
                       />
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
                    <p className="mt-1.5 text-xs leading-tight font-medium">
                      {financials.balanceCorrection.trim() === '' 
                        ? <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            Locked: Enter a Balance Correction first (even if 0) to unlock this field.
                          </span>
                        : <span className="text-blue-700 bg-blue-50 p-2 rounded border border-blue-200 block">
                            Action: Count all physical cash collected from machines and enter the exact total here.
                          </span>}
                    </p>
                  </div>

                  {/* Balance Correction */}
                  <div>
                     <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                       Balance Correction:{' '}
                       <span className="text-red-500 ml-1">*</span>
                       <CalculationHelp 
                         title="Balance Correction" 
                         formula="Manual Adjustment to Opening Balance" 
                         description="Use this to set or adjust the starting balance for this collection. It 'unlocks' the Collected Amount field to ensure you acknowledge the starting state before entering the collection results."
                       />
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
                          onBaseBalanceCorrectionChange(e.target.value);
                        }
                      }}
                      className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Balance correction amount (editable)"
                      disabled={
                        isProcessing || financials.collectedAmount.trim() !== ''
                      }
                    />
                    <p className="mt-1.5 text-xs leading-tight font-medium">
                      {financials.collectedAmount.trim() !== '' 
                        ? <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            Note: Clear the 'Collected Amount' above if you need to re-adjust this field.
                          </span> 
                        : <span className="text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 block">
                            Required: Set the opening balance or adjustments for this collection batch.
                          </span>}
                    </p>
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
                     <label className="mb-1 flex items-center text-sm font-medium">
                       Previous Balance:
                       <CalculationHelp 
                         title="Current/New Balance" 
                         formula="Collected Amount - Amount to Collect" 
                         description="This shows if there is a shortage (negative) or overage (positive) in the collection. This value will be carried over as the 'Opening Balance' for the next collection at this location."
                       />
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

                  {/* Detailed Calculation Guide - Added for clarity */}
                  <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100 flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-blue-900 uppercase">Detailed Calculation Guide</p>
                      <p className="text-[10px] leading-relaxed text-blue-800/80 italic">
                        The Target Amount is recalculated every time you enter a machine or update financials. 
                        Your physical cash should match this target. Any difference is automatically 
                        saved as a carry-over balance for the next collection.
                      </p>
                    </div>
                  </div>

                  {/* Financial Reconciliation Summary Breakdown */}
                  <div className="mt-4 border-t border-gray-100 bg-blue-50/40 p-4 rounded-xl">
                    <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-900">
                      <Info className="h-4 w-4 text-blue-600" />
                      Reconciliation Summary
                    </h5>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm border border-blue-100">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Target Amount</p>
                          <p className="text-sm font-black text-blue-900">${financials.amountToCollect || '0.00'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Actual Collected</p>
                          <p className="text-sm font-black text-blue-900">${financials.collectedAmount || '0.00'}</p>
                        </div>
                      </div>
                      
                      <div className="rounded-lg bg-white p-3 shadow-sm border border-blue-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">New Carry-Over Balance</p>
                        <p className={`text-base font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${financials.previousBalance || '0.00'}
                        </p>
                      </div>

                      <div className="rounded-lg bg-blue-900/5 p-2.5 border border-blue-100">
                        <p className="text-xs font-mono text-blue-800 leading-relaxed text-center">
                          <span className="font-bold">{financials.collectedAmount || '0.00'}</span> 
                          <span className="mx-1 text-blue-400">-</span>
                          <span className="font-bold">{financials.amountToCollect || '0.00'}</span> 
                          <span className="mx-1 text-blue-400">=</span>
                          <span className={`font-bold ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {financials.previousBalance || '0.00'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Footer */}
          <div className="space-y-3 border-t bg-gray-50 p-4">
            {/* View Form Button - Show when there's at least 1 machine in collection */}
            {collectedMachinesCount > 0 && !isManager && (
              <button
                onClick={onViewCollectedList}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                View Form ({collectedMachinesCount} machine
                {collectedMachinesCount !== 1 ? 's' : ''})
              </button>
            )}

            {!isManager && (
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
            )}
            
            {isManager && (
              <button
                onClick={onViewCollectedList}
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition-colors hover:bg-green-700"
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

