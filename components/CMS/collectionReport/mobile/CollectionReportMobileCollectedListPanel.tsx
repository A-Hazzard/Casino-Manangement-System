'use client';

import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import type { CollectionDocument } from '@/lib/types/collection';
import { ArrowLeft, Edit3, Trash2, Info, SendHorizontal } from 'lucide-react';
import React from 'react';

type MobileCollectedListPanelProps = {
  isVisible: boolean;
  onBack: () => void;
  isEditing?: boolean; // True when editing an existing report

  // Machine list
  collectedMachines: CollectionDocument[];
  searchTerm: string;
  onSearchChange: (term: string) => void;

  // View toggle
  isViewingFinancialForm: boolean;
  onToggleView: (isFinancial: boolean) => void;

  // Financials
  financials: {
    amountToCollect: string;
    balanceCorrection: string;
    collectedAmount: string;
    taxes: string;
    variance: string;
    advance: string;
    previousBalance: string;
  };

  isProcessing: boolean;
  isCreateReportsEnabled: boolean;

  // Update all SAS times feature
  updateAllSasStartDate: Date | undefined;
  onUpdateAllSasStartDate: (date: Date | undefined) => void;
  updateAllSasEndDate: Date | undefined;
  onUpdateAllSasEndDate: (date: Date | undefined) => void;
  onApplyAllDates: () => void;

  // Callbacks
  formatMachineDisplay: (machine: {
    serialNumber?: string;
    custom: { name?: string };
    game?: string;
  }) => React.ReactElement;
  formatDate: (date: Date) => string;
  sortMachines: (machines: CollectionDocument[]) => CollectionDocument[];
  onEditMachine: (machine: CollectionDocument) => void;
  onDeleteMachine: (machineId: string) => void;
  onFinancialDataChange: (field: string, value: string) => void;
  onCreateReport: () => void;
  onCollectedAmountChange?: (value: string) => void;
  baseBalanceCorrection?: string;
  onBaseBalanceCorrectionChange?: (value: string) => void;
};

/**
 * CollectionReportMobileCollectedListPanel Component
 * Displays the collected machines list or financial form in mobile modal
 */
export default function CollectionReportMobileCollectedListPanel({
  isVisible,
  onBack,
  isEditing = false,
  collectedMachines,
  searchTerm,
  onSearchChange,
  isViewingFinancialForm,
  onToggleView,
  financials,
  isProcessing,
  isCreateReportsEnabled,
  updateAllSasStartDate,
  onUpdateAllSasStartDate,
  updateAllSasEndDate,
  onUpdateAllSasEndDate,
  onApplyAllDates,
  formatMachineDisplay: _formatMachineDisplay,
  formatDate,
  sortMachines,
  onEditMachine,
  onDeleteMachine,
  onFinancialDataChange,
  onCreateReport,
  onCollectedAmountChange,
  baseBalanceCorrection: _baseBalanceCorrection,
  onBaseBalanceCorrectionChange,
}: MobileCollectedListPanelProps) {
  // Filter and sort machines
  const filteredMachines = collectedMachines.filter(machine => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const machineName = (machine.machineName || '').toLowerCase();
    const machineCustomName = (machine.machineCustomName || '').toLowerCase();
    const machineId = (machine.machineId || '').toLowerCase();
    const serialNumber = (machine.serialNumber || '').toLowerCase();
    const game = (machine.game || '').toLowerCase();

    return (
      machineName.includes(term) ||
      machineCustomName.includes(term) ||
      machineId.includes(term) ||
      serialNumber.includes(term) ||
      game.includes(term)
    );
  });

  const sortedMachines = sortMachines(filteredMachines);

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
          {/* List Header */}
          <div className="sticky top-0 z-[100] flex items-center justify-between border-b bg-white px-2 py-3 shadow-sm">
            <div className="flex items-center gap-1">
              <button
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 active:scale-95"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h3 className="text-lg font-bold text-gray-900">
                Collected ({collectedMachines.length})
              </h3>
            </div>
            {collectedMachines.length > 0 && (
              <div className="mr-2 flex rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => onToggleView(false)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    !isViewingFinancialForm
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => onToggleView(true)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    isViewingFinancialForm
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Financial
                </button>
              </div>
            )}
          </div>

          {/* Content Area - Show either machine list or financial form */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {collectedMachines.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="text-center text-gray-500">
                  <p>No machines added to collection yet.</p>
                  <p className="mt-2 text-sm">
                    Go back and select machines to add them here.
                  </p>
                </div>
              </div>
            ) : isViewingFinancialForm ? (
              // Show Financial Form
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto pb-4">
                  {/* Financial Form Section */}
                  <div className="p-4 pb-8">
                    <h3 className="mb-4 text-center text-lg font-semibold text-gray-700">
                      Financial Summary
                    </h3>

                    <div className="space-y-4">
                      {/* Amount to Collect */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                          Amount to Collect *
                          <CalculationHelp 
                            title="Amount to Collect" 
                            formula="(Meters Profit - Variance - Advance) - Partner Share + Opening Balance" 
                            description="This is the ESTIMATED target amount. It starts with the machine revenue (Meters In - Out), subtracts manual adjustments (Advance/Variance) and the Partner's share, and then adds the opening balance carried over from the previous collection."
                          />
                        </label>
                        <input
                          type="text"
                          value={financials.amountToCollect}
                          readOnly
                          className="w-full cursor-not-allowed rounded-lg border bg-gray-50 p-3 font-semibold text-gray-900"
                          title="Auto-calculated based on machine data and financial inputs"
                        />
                        <p className="mt-1 text-[10px] text-gray-500">
                          Calculated automatically based on meters and location share settings.
                        </p>
                      </div>

                      {/* Balance Correction */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                          Balance Correction *
                          <CalculationHelp 
                            title="Balance Correction" 
                            formula="Manual Adjustment + (Collected - Amount to Collect)" 
                            description="This field shows the final balance for the current location. It's calculated by taking the manual correction and adding the current collection difference (Shortage/Overage). You must set a manual value here first to unlock the 'Collected Amount' field."
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={financials.balanceCorrection}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('balanceCorrection', val);
                              if (onBaseBalanceCorrectionChange) onBaseBalanceCorrectionChange(val);
                            }
                          }}
                          disabled={isProcessing || financials.collectedAmount.trim() !== ''}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1.5 text-xs leading-tight font-medium">
                          {financials.collectedAmount.trim() !== '' 
                            ? <span className="text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                                <Info className="h-3.5 w-3.5 shrink-0" />
                                Note: Clear the 'Collected Amount' below if you need to re-adjust this field.
                              </span> 
                            : <span className="text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 block">
                                Required: Set the opening balance or adjustments for this collection batch.
                              </span>}
                        </p>
                      </div>

                      {/* Collected Amount */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                          Collected Amount
                          <CalculationHelp 
                            title="Collected Amount" 
                            formula="The actual physical cash you counted" 
                            description="Enter the EXACT total amount of physical cash retrieving from all machines. The system compares this to the 'Amount to Collect' to determine the shortage or overage for the next report."
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={financials.collectedAmount}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('collectedAmount', val);
                              if (onCollectedAmountChange) onCollectedAmountChange(val);
                            }
                          }}
                          disabled={isProcessing || financials.balanceCorrection.trim() === ''}
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

                      {/* Taxes */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-medium">
                          Taxes
                          <CalculationHelp 
                            title="Taxes" 
                            formula="Value entered manually" 
                            description="Government taxes applied to the profit share."
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={financials.taxes}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('taxes', val);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

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
                          placeholder="0.00"
                          value={financials.variance}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('variance', val);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Advance */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-medium">
                          Advance
                          <CalculationHelp 
                            title="Advance" 
                            formula="Value entered manually" 
                            description="Upfront payment or loan provided to the partner."
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={financials.advance}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('advance', val);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Previous Balance */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-medium">
                          Previous Balance
                          <CalculationHelp 
                            title="Current/New Balance" 
                            formula="Collected Amount - Amount to Collect" 
                            description="The difference between what you actually collected and what the system expected. A negative value means a shortage. This net result is carried forward to the next collection report automatically."
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={financials.previousBalance}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('previousBalance', val);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Auto-calculated as collected amount minus amount to collect (editable)"
                        />
                      </div>
                    </div>

                    {/* Financial Reconciliation Summary Breakdown */}
                    <div className="mt-4 border-t border-gray-100 bg-blue-50/40 p-4">
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
                        
                        <div className="rounded-lg bg-white/60 p-3 border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-900 mb-1.5 uppercase">Breakdown Guide:</p>
                          <ul className="space-y-1 text-[9px] text-gray-700">
                            <li>• <span className="font-bold">Target</span>: Expected based on revenue/share + Correction.</li>
                            <li>• <span className="font-bold">Collected</span>: Physical cash Retrieved.</li>
                            <li>• <span className="font-bold">Carryover</span>: Collected minus Target. Becomes next Opening.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Form Footer */}
                <div className="border-t bg-gray-50 p-4">
                  <button
                    onClick={onCreateReport}
                    disabled={!isCreateReportsEnabled || isProcessing}
                    className={`w-full rounded-lg py-3 font-semibold transition-colors ${
                      isCreateReportsEnabled && !isProcessing
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'cursor-not-allowed bg-gray-400 text-gray-200'
                    }`}
                  >
                    {isProcessing
                      ? isEditing ? 'Updating Report...' : 'Creating Report...'
                      : isEditing
                        ? `UPDATE COLLECTION REPORT (${collectedMachines.length} machines)`
                        : `CREATE COLLECTION REPORT (${collectedMachines.length} machines)`}
                  </button>
                </div>
              </div>
            ) : (
              // === Machine List View ===
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Scrollable content - ensure it grows to fill flex container */}
                <div className="mobile-collection-scrollbar flex flex-1 flex-col overflow-y-auto min-h-0">
                {/* Live Reconciliation Summary - ALWAYS SHOWN ABOVE LIST */}
                <div className="border-b bg-blue-50/50 px-4 py-4">
                  <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                    <h5 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      <Info className="h-3 w-3" />
                      Live Reconciliation Summary
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5 border-r border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Target</p>
                        <p className="text-sm font-black text-gray-900">${financials.amountToCollect || '0.00'}</p>
                      </div>
                      <div className="space-y-0.5 pl-2">
                         <p className="text-[9px] font-bold text-gray-400 uppercase">Actual</p>
                         <p className="text-sm font-black text-blue-600">${financials.collectedAmount || '0.00'}</p>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-gray-50 pt-3">
                      <div className="flex items-center justify-between">
                         <p className="text-[9px] font-bold text-gray-400 uppercase">Next Opening Balance</p>
                         <p className={`text-xs font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                           ${financials.previousBalance || '0.00'}
                         </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-[9px] text-blue-600/70 italic px-2">
                       (Collected minus Target = New Carryover Balance)
                    </p>
                  </div>
                </div>

                <div className="flex-1 p-4">
                  {/* Update All SAS Times - Show if there are 1 or more machines */}
                  {collectedMachines.length >= 1 && (
                    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">
                        Update All SAS Times
                      </label>
                      
                      {/* SAS Start Time */}
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-gray-600">
                          SAS Start Time
                        </label>
                        <ModernCalendar
                          date={updateAllSasStartDate ? { from: updateAllSasStartDate, to: updateAllSasStartDate } : undefined}
                          onSelect={(range) => onUpdateAllSasStartDate(range?.from)}
                          disabled={isProcessing}
                          mode="single"
                          enableTimeInputs={true}
                        />
                      </div>

                      {/* SAS End Time */}
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-gray-600">
                          SAS End Time
                        </label>
                        <ModernCalendar
                          date={updateAllSasEndDate ? { from: updateAllSasEndDate, to: updateAllSasEndDate } : undefined}
                          onSelect={(range) => onUpdateAllSasEndDate(range?.from)}
                          disabled={isProcessing}
                          mode="single"
                          enableTimeInputs={true}
                        />
                      </div>

                      <button
                        onClick={onApplyAllDates}
                        disabled={(!updateAllSasStartDate && !updateAllSasEndDate) || isProcessing}
                        className="mt-1 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProcessing ? 'Updating...' : 'Apply SAS Times to All'}
                      </button>
                    </div>
                  )}

                  {/* Search bar for collected machines */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search collected machines..."
                      value={searchTerm}
                      onChange={e => onSearchChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {sortedMachines.length === 0 && searchTerm ? (
                    <div className="py-8 text-center text-gray-500">
                      <p>No machines found matching &quot;{searchTerm}&quot;</p>
                    </div>
                  ) : (
                    sortedMachines.map(machine => (
                      <div
                        key={machine._id}
                        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                             {/* Rich Machine Identification */}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">
                                {machine.serialNumber || 'No Serial'}
                              </p>
                              <h4 className="text-sm font-black text-gray-900 leading-tight">
                                {machine.machineCustomName || machine.machineName || 'Unknown Machine'}
                              </h4>
                              <p className="text-[10px] font-medium text-gray-400 italic">
                                Game: {machine.game || 'Standard Slot'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                              <p>In: <span className="font-bold text-gray-900">{machine.metersIn}</span></p>
                              <p>Out: <span className="font-bold text-gray-900">{machine.metersOut}</span></p>
                              <p className="col-span-2 text-[10px]">
                                Time: <span className="font-medium">{formatDate(new Date(machine.timestamp))}</span>
                              </p>
                              {machine.sasMeters?.sasStartTime && machine.sasMeters?.sasEndTime ? (
                                <p className="col-span-2 text-[10px]">
                                  SAS: <span className="font-medium">{formatDate(new Date(machine.sasMeters.sasStartTime))} → {formatDate(new Date(machine.sasMeters.sasEndTime))}</span>
                                </p>
                              ) : (
                                <p className="col-span-2 text-[10px] italic text-gray-400">
                                  SAS: Not Set
                                </p>
                              )}
                            </div>
                            {machine.notes && (
                              <p className="text-[10px] italic text-gray-400 line-clamp-2">
                                Notes: {machine.notes}
                              </p>
                            )}
                            {machine.ramClear && (
                              <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 border border-red-100 w-fit">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">RAM Cleared</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => onEditMachine(machine)}
                              className="rounded-full bg-blue-50 p-2.5 text-blue-600 hover:bg-blue-100 active:scale-90 transition-all shadow-sm"
                              disabled={isProcessing}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteMachine(machine._id)}
                              className="rounded-full bg-red-50 p-2.5 text-red-600 hover:bg-red-100 active:scale-90 transition-all shadow-sm"
                              disabled={isProcessing}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                </div>

                {/* Sticky Submit Footer */}
                <div className="shrink-0 border-t bg-white/90 p-4 backdrop-blur-md">
                  <button
                    onClick={onCreateReport}
                    disabled={!isCreateReportsEnabled || isProcessing}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold shadow-lg transition-all active:scale-95 ${
                      isCreateReportsEnabled && !isProcessing
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-green-200 shadow-green-600/20'
                        : 'cursor-not-allowed bg-gray-400 text-gray-200'
                    }`}
                  >
                    <SendHorizontal className="h-5 w-5" />
                    {isProcessing ? 'PROCESSING...' : 'SUBMIT FINAL REPORT'}
                  </button>
                  <p className="mt-2 text-center text-[10px] text-gray-400 font-medium">
                    Finalize readings for all {collectedMachines.length} machines.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

