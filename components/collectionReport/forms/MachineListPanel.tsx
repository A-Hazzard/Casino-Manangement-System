'use client';

import React from 'react';
import type { CollectionReportMachineSummary } from '@/lib/types/api';

type MachineListPanelProps = {
  machines: CollectionReportMachineSummary[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedMachineId?: string | null;
  onSelectMachine: (machine: CollectionReportMachineSummary) => void;
  isLoading?: boolean;
  formatMachineDisplay: (machine: CollectionReportMachineSummary) => string;
  className?: string;
};

/**
 * MachineListPanel Component  
 * Displays searchable list of machines for selection
 */
export const MachineListPanel: React.FC<MachineListPanelProps> = ({
  machines,
  searchTerm,
  onSearchChange,
  selectedMachineId,
  onSelectMachine,
  isLoading = false,
  formatMachineDisplay,
  className = '',
}) => {
  const filteredMachines = machines.filter((machine) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    const machineName = (machine.name || '').toLowerCase();
    const serialNumber = (machine.serialNumber || '').toLowerCase();
    return machineName.includes(search) || serialNumber.includes(search);
  });

  return (
    <div className={`mt-6 flex flex-col flex-1 min-h-0 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Machines</h3>
      
      {/* Search Input */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search machines by name..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Machine List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
        {isLoading ? (
          // Loading skeleton
          [1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 border rounded-lg bg-gray-50 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          ))
        ) : filteredMachines.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {searchTerm ? `No machines found matching "${searchTerm}"` : 'No machines available'}
          </p>
        ) : (
          filteredMachines.map((machine) => {
            const isSelected = selectedMachineId === machine._id;
            return (
              <div
                key={String(machine._id)}
                className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onSelectMachine(machine)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p
                      className="text-sm font-semibold"
                      dangerouslySetInnerHTML={{
                        __html: formatMachineDisplay(machine),
                      }}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Prev In: {machine.collectionMeters?.metersIn || 0} | Prev
                      Out: {machine.collectionMeters?.metersOut || 0}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMachine(machine);
                    }}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSelected ? 'Unselect' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

