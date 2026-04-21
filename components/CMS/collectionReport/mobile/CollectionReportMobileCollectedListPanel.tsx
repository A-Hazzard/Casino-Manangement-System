'use client';

import { ReactElement } from 'react';
import { CalculationHelp } from '@/components/shared/ui/CalculationHelp';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import type { CollectionDocument } from '@/lib/types/collection';
import { ArrowLeft, Edit3, Trash2, Info, SendHorizontal } from 'lucide-react';

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
  isCreateReportsEnabled?: boolean;

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
  }) => ReactElement;
  formatDate: (date: Date) => string;
  sortMachines: (machines: CollectionDocument[]) => CollectionDocument[];
  onEditMachine: (machine: CollectionDocument) => void;
  onDeleteMachine: (machineId: string) => void;
  onFinancialDataChange: (field: string, value: string) => void;
  onCreateReport: () => void;
  onCollectedAmountChange?: (value: string) => void;
  baseBalanceCorrection?: string;
  onBaseBalanceCorrectionChange?: (value: string) => void;
  variationMachineIds?: string[];
};

/**
 * CollectionReportMobileCollectedListPanel Component
 *
 * A high-level mobile container that toggles between the collected machine list and the final financial reconciliation form.
 *
 * Features:
 * - Tabbed interface for switching between "List" and "Financial" views
 * - Responsive machine cards with "Variation" indicators
 * - Live reconciliation summary anchored above the list
 * - Batch update controls for SAS time periods
 * - Full-screen modal experience with slide animations
 *
 * @param isVisible - Visibility flag for the panel
 * @param onBack - Callback to return to the selection or form screen
 * @param isEditing - Whether we are modifying an existing submitted report
 * @param collectedMachines - Array of collection documents successfully added to the batch
 * @param searchTerm - Active filter string for the machine list
 * @param onSearchChange - Callback triggered by the search input
 * @param isViewingFinancialForm - Active view state (false for machine list, true for financials)
 * @param onToggleView - Switcher callback between list and financials
 * @param financials - Complete set of reconciliation fields (taxes, advance, variance, etc.)
 * @param isProcessing - Loading status for batch actions or final submission
 * @param isCreateReportsEnabled - Validation flag to allow final report creation
 * @param updateAllSasStartDate - Current batch SAS start time value
 * @param onUpdateAllSasStartDate - Setter for the batch start time
 * @param updateAllSasEndDate - Current batch SAS end time value
 * @param onUpdateAllSasEndDate - Setter for the batch end time
 * @param onApplyAllDates - Execution callback for the batch time update
 * @param formatDate - Utility for consistent date display
 * @param sortMachines - Logic for ordering the machine list
 * @param onEditMachine - Callback to jump back to the form for a specific machine
 * @param onDeleteMachine - Callback to remove a machine from the batch
 * @param onFinancialDataChange - Dispatcher for updating the reconciliation state
 * @param onCreateReport - Final submission callback for the entire report
 * @param onCollectedAmountChange - Sync callback for physical cash input
 * @param onBaseBalanceCorrectionChange - Sync callback for anchor balance input
 * @param variationMachineIds - Array of machine IDs with financial discrepancies for badging
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
  formatDate,
  sortMachines,
  onEditMachine,
  onDeleteMachine,
  onFinancialDataChange,
  onCreateReport,
  onCollectedAmountChange,
  onBaseBalanceCorrectionChange,
  variationMachineIds = [],
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
      className={`fixed inset-0 z-[110] flex h-full w-full transform flex-col bg-white shadow-xl transition-all duration-300 ease-in-out md:relative md:inset-auto md:flex md:h-full md:w-full md:flex-1 md:rounded-xl md:shadow-none ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
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
            {isViewingFinancialForm ? (
              // Show Financial Form
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto pb-4">
                  <div className="p-4 pb-8">
                    <h3 className="mb-4 text-center text-lg font-semibold text-gray-700">
                      Financial Summary
                    </h3>

                    {/* Financial Reconciliation Summary Breakdown - Moved to top of mobile tab */}
                    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
                      <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-900">
                        <Info className="h-4 w-4 text-blue-600" />
                        Reconciliation Summary
                      </h5>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                              Target Amount
                            </p>
                            <p className="text-sm font-black text-blue-900">
                              ${financials.amountToCollect || '0.00'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                              Actual Collected
                            </p>
                            <p className="text-sm font-black text-blue-900">
                              ${financials.collectedAmount || '0.00'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                            New Carry-Over Balance
                          </p>
                          <p
                            className={`text-base font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}
                          >
                            ${financials.previousBalance || '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>

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
                        />
                      </div>

                      {/* Balance Correction */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                          Balance Correction *
                          <CalculationHelp
                            title="Balance Correction"
                            formula="Manual Adjustment + (Collected - Amount to Collect)"
                            description="This field shows the final balance for the current location. It's calculated by taking the manual correction and adding the current collection difference (Shortage/Overage)."
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
                      </div>

                      {/* Collected Amount */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-bold text-gray-700">
                          Collected Amount
                          <CalculationHelp
                            title="Collected Amount"
                            formula="The actual physical cash you counted"
                            description="Enter the EXACT total amount of physical cash retrieving from all machines."
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
                      </div>

                      {/* Taxes */}
                      <div>
                        <label className="mb-1 flex items-center text-sm font-medium">Taxes</label>
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
                        <label className="mb-1 flex items-center text-sm font-medium">Variance</label>
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
                        <label className="mb-1 flex items-center text-sm font-medium">Advance</label>
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
                        <label className="mb-1 flex items-center text-sm font-medium">Previous Balance</label>
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
                        />
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
            ) : collectedMachines.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-gray-500">
                <div>
                  <p>No machines added to collection yet.</p>
                  <p className="mt-2 text-sm">Go back and select machines to add them here.</p>
                </div>
              </div>
            ) : (
              // === Machine List View ===
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="mobile-collection-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
                  {/* Live Reconciliation Summary - ALWAYS SHOWN ABOVE LIST */}
                  <div className="border-b bg-blue-50/50 px-4 py-4">
                    <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                      <h5 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                        <Info className="h-3 w-3" />
                        Live Reconciliation Summary
                      </h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5 border-r border-gray-100">
                          <p className="text-[9px] font-bold uppercase text-gray-400">Target</p>
                          <p className="text-sm font-black text-gray-900">${financials.amountToCollect || '0.00'}</p>
                        </div>
                        <div className="space-y-0.5 pl-2">
                          <p className="text-[9px] font-bold uppercase text-gray-400">Actual</p>
                          <p className="text-sm font-black text-blue-600">${financials.collectedAmount || '0.00'}</p>
                        </div>
                      </div>
                      <div className="mt-3 border-t border-gray-50 pt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold uppercase text-gray-400">Next Opening Balance</p>
                          <p className={`text-xs font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${financials.previousBalance || '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-4">
                    {/* Update All SAS Times */}
                    {collectedMachines.length >= 1 && (
                      <div className="mb-3 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <label className="block text-sm font-semibold text-gray-700">Update All Times</label>
                        <div className="flex flex-col gap-2">
                          <div className="flex-1 min-w-0">
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Start Time</label>
                            <ModernCalendar
                              date={updateAllSasStartDate ? { from: updateAllSasStartDate, to: updateAllSasStartDate } : undefined}
                              onSelect={(range) => onUpdateAllSasStartDate(range?.from)}
                              enableTimeInputs={true}
                              mode="single"
                              className="w-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">End Time</label>
                            <ModernCalendar
                              date={updateAllSasEndDate ? { from: updateAllSasEndDate, to: updateAllSasEndDate } : undefined}
                              onSelect={(range) => onUpdateAllSasEndDate(range?.from)}
                              enableTimeInputs={true}
                              mode="single"
                              className="w-full"
                            />
                          </div>
                        </div>
                        <button
                          onClick={onApplyAllDates}
                          disabled={(!updateAllSasStartDate && !updateAllSasEndDate) || isProcessing}
                          className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md active:scale-95 disabled:bg-gray-400"
                        >
                          {isProcessing ? 'Updating...' : 'Apply Times to All'}
                        </button>
                      </div>
                    )}

                    {/* Search */}
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
                      sortedMachines.map(machine => {
                        const hasVariation = variationMachineIds.some(vid => String(vid) === String(machine.machineId));
                        return (
                          <div
                            key={machine._id}
                            className={`mb-3 rounded-xl border p-4 shadow-sm transition-colors ${
                              hasVariation 
                                ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400 shadow-amber-100' 
                                : 'border-gray-100 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className={`mb-0.5 text-[10px] font-bold uppercase tracking-wider ${hasVariation ? 'text-amber-800' : 'text-blue-600'}`}>
                                      {machine.serialNumber || 'No Serial'}
                                    </p>
                                    <h4 className={`text-sm font-black leading-tight ${hasVariation ? 'text-amber-950' : 'text-gray-900'}`}>
                                      {machine.machineCustomName || machine.machineName || 'Unknown Machine'}
                                    </h4>
                                  </div>
                                  {hasVariation && (
                                    <div className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-sm">
                                      <Info className="h-2 w-2" />
                                      Variation
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <p>In: <span className="font-bold text-gray-900">{machine.metersIn}</span> <span className="ml-1 text-[10px] font-normal text-gray-400">(Prev: {machine.prevIn || 0})</span></p>
                                  <p>Out: <span className="font-bold text-gray-900">{machine.metersOut}</span> <span className="ml-1 text-[10px] font-normal text-gray-400">(Prev: {machine.prevOut || 0})</span></p>
                                  <div className="col-span-2 mt-1 space-y-0.5 border-t border-gray-50 pt-1 text-[9px]">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Start Time:</span>
                                      <span className="font-bold text-gray-700">{machine.sasMeters?.sasStartTime ? formatDate(new Date(machine.sasMeters.sasStartTime)) : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">End Time:</span>
                                      <span className="font-bold text-gray-700">{machine.sasMeters?.sasEndTime ? formatDate(new Date(machine.sasMeters.sasEndTime)) : 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => onEditMachine(machine)}
                                  className="rounded-full bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                                  disabled={isProcessing}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteMachine(machine._id)}
                                  className="rounded-full bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                  disabled={isProcessing}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t bg-white/90 p-4 backdrop-blur-md">
                  <button
                    onClick={onCreateReport}
                    disabled={!isCreateReportsEnabled || isProcessing}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold shadow-lg transition-all ${
                      isCreateReportsEnabled && !isProcessing
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-green-600/20'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    <SendHorizontal className="h-5 w-5" />
                    {isProcessing ? 'PROCESSING...' : 'SUBMIT FINAL REPORT'}
                  </button>
                  <p className="mt-2 text-center text-[10px] font-medium text-gray-400">
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
}
