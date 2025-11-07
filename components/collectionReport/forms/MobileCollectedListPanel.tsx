'use client';

import { PCDateTimePicker } from '@/components/ui/pc-date-time-picker';
import type { CollectionDocument } from '@/lib/types/collections';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import React from 'react';

type MobileCollectedListPanelProps = {
  isVisible: boolean;
  onBack: () => void;

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

  // Update all dates feature
  updateAllDate: Date | undefined;
  onUpdateAllDate: (date: Date | undefined) => void;
  onApplyAllDates: () => void;

  // Callbacks
  formatMachineDisplay: (machine: {
    serialNumber?: string;
    custom: { name?: string };
  }) => React.ReactElement;
  formatDate: (date: Date) => string;
  sortMachines: (machines: CollectionDocument[]) => CollectionDocument[];
  onEditMachine: (machine: CollectionDocument) => void;
  onDeleteMachine: (machineId: string) => void;
  onFinancialDataChange: (field: string, value: string) => void;
  onCreateReport: () => void;
};

/**
 * MobileCollectedListPanel Component
 * Displays the collected machines list or financial form in mobile modal
 */
export const MobileCollectedListPanel: React.FC<
  MobileCollectedListPanelProps
> = ({
  isVisible,
  onBack,
  collectedMachines,
  searchTerm,
  onSearchChange,
  isViewingFinancialForm,
  onToggleView,
  financials,
  isProcessing,
  isCreateReportsEnabled,
  updateAllDate,
  onUpdateAllDate,
  onApplyAllDates,
  formatMachineDisplay,
  formatDate,
  sortMachines,
  onEditMachine,
  onDeleteMachine,
  onFinancialDataChange,
  onCreateReport,
}) => {
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
      className={`fixed z-[90] h-full w-full transform bg-white shadow-xl transition-all duration-300 ease-in-out md:h-[90vh] md:rounded-xl ${
        isVisible
          ? 'inset-0 translate-y-0 opacity-100 md:inset-auto md:left-[50%] md:top-[50%] md:-translate-x-1/2 md:-translate-y-1/2'
          : 'pointer-events-none inset-0 translate-y-full opacity-0 md:inset-auto md:left-[50%] md:top-[50%] md:-translate-x-1/2 md:-translate-y-1/2 md:translate-y-[-50%]'
      } `}
    >
      {isVisible && (
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* List Header */}
          <div className="flex items-center justify-between rounded-t-xl border-b bg-green-600 p-4 text-white md:rounded-t-xl">
            <button
              onClick={onBack}
              className="rounded-full p-2 hover:bg-green-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">
                Collected Machines ({collectedMachines.length})
              </h3>
              {collectedMachines.length > 0 && (
                <div className="flex rounded-lg bg-green-700 p-1">
                  <button
                    onClick={() => onToggleView(false)}
                    className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                      !isViewingFinancialForm
                        ? 'bg-white text-green-600'
                        : 'text-white hover:bg-green-600'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => onToggleView(true)}
                    className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                      isViewingFinancialForm
                        ? 'bg-white text-green-600'
                        : 'text-white hover:bg-green-600'
                    }`}
                  >
                    Financial
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content Area - Show either machine list or financial form */}
          <div className="flex flex-1 flex-col">
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
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-y-auto">
                  {/* Financial Form Section */}
                  <div className="p-4">
                    <h3 className="mb-4 text-center text-lg font-semibold text-gray-700">
                      Financial Summary
                    </h3>

                    <div className="space-y-4">
                      {/* Amount to Collect */}
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Amount to Collect *
                        </label>
                        <input
                          type="text"
                          value={financials.amountToCollect}
                          readOnly
                          className="w-full rounded-lg border bg-gray-100 p-3 font-semibold text-gray-700"
                          title="Auto-calculated based on machine data and financial inputs"
                        />
                      </div>

                      {/* Balance Correction */}
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Balance Correction *
                        </label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={financials.balanceCorrection}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('balanceCorrection', val);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Collected Amount */}
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Collected Amount
                        </label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={financials.collectedAmount}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^-?\d*\.?\d*$/.test(val) || val === '') {
                              onFinancialDataChange('collectedAmount', val);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Taxes */}
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Taxes
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
                        <label className="mb-1 block text-sm font-medium">
                          Variance
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
                        <label className="mb-1 block text-sm font-medium">
                          Advance
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
                        <label className="mb-1 block text-sm font-medium">
                          Previous Balance
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
                      ? 'Creating Report...'
                      : `Create Collection Report (${collectedMachines.length} machines)`}
                  </button>
                </div>
              </div>
            ) : (
              // Show Machine List
              <div className="mobile-collection-scrollbar flex-1 overflow-y-auto">
                <div className="space-y-3 p-4 pb-4">
                  {/* Update All Dates - Show if there are 2 or more machines */}
                  {collectedMachines.length >= 2 && (
                    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Update All Dates
                      </label>
                      <p className="mb-2 text-xs text-gray-600">
                        Select date/time to apply to all {collectedMachines.length} machines
                      </p>
                      <PCDateTimePicker
                        date={updateAllDate}
                        setDate={date => {
                          if (
                            date &&
                            date instanceof Date &&
                            !isNaN(date.getTime())
                          ) {
                            onUpdateAllDate(date);
                          }
                        }}
                        disabled={isProcessing}
                        placeholder="Select date/time"
                      />
                      <button
                        onClick={onApplyAllDates}
                        disabled={!updateAllDate || isProcessing}
                        className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProcessing ? 'Updating...' : 'Apply to All Machines'}
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
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold">
                              {formatMachineDisplay({
                                serialNumber: machine.serialNumber,
                                custom: {
                                  name: machine.machineCustomName,
                                },
                              })}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              In: {machine.metersIn} | Out: {machine.metersOut}
                            </p>
                            <p className="text-xs text-gray-500">
                              Time: {formatDate(machine.timestamp)}
                            </p>
                            {machine.notes && (
                              <p className="mt-1 text-xs italic text-gray-500">
                                Notes: {machine.notes}
                              </p>
                            )}
                            {machine.ramClear && (
                              <p className="mt-1 text-xs font-semibold text-red-600">
                                RAM Cleared
                              </p>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => onEditMachine(machine)}
                              className="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                              disabled={isProcessing}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteMachine(machine._id)}
                              className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200"
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
