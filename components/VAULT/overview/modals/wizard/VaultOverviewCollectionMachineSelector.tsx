/**
 * Vault Overview Collection Machine Selector Component
 *
 * Left panel component for selecting machines to collect from.
 * Includes a progress summary and quick history access.
 *
 * @module components/VAULT/overview/modals/wizard/VaultOverviewCollectionMachineSelector
 */
'use client';

import { Input } from '@/components/shared/ui/input';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import {
  Check,
  History as HistoryIcon,
  Monitor,
  Plus,
  Search,
} from 'lucide-react';
import { useMemo } from 'react';

type VaultOverviewCollectionMachineSelectorProps = {
  machines: GamingMachine[];
  selectedMachineId: string | null;
  collectedMachineIds: string[];
  onSelect: (machineId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onViewHistory?: (machineId: string) => void;
}

export default function VaultOverviewCollectionMachineSelector({
  machines,
  selectedMachineId,
  collectedMachineIds,
  onSelect,
  searchTerm,
  onSearchChange,
  onViewHistory,
}: VaultOverviewCollectionMachineSelectorProps) {
  // ============================================================================
  // Computed
  // ============================================================================
  const filteredMachines = useMemo(() => {
    // Sort machines by most moneyIn (descending)
    const sortedMachines = [...machines].sort(
      (a, b) => (b.moneyIn || 0) - (a.moneyIn || 0)
    );

    if (!searchTerm) return sortedMachines;
    const lowerTerm = searchTerm.toLowerCase();
    return sortedMachines.filter(
      m =>
        String(m.custom?.name ?? '')
          .toLowerCase()
          .includes(lowerTerm) ||
        m.serialNumber?.toLowerCase().includes(lowerTerm) ||
        m.assetNumber?.toLowerCase().includes(lowerTerm) ||
        m.locationName?.toLowerCase().includes(lowerTerm)
    );
  }, [machines, searchTerm]);

  const collectedCount = collectedMachineIds.length;
  const totalCount = machines.length;
  const percentComplete =
    totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex h-full w-full min-w-0 flex-col border-r border-gray-100 bg-white">
      {/* Header & Search */}
      <div className="sticky top-0 z-10 space-y-4 border-b border-gray-50 bg-white p-4 shadow-sm md:p-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 truncate text-[10px] font-black uppercase tracking-widest text-gray-900 md:text-xs">
              <Monitor className="h-3.5 w-3.5 shrink-0 text-violet-500 md:h-4 md:w-4" />
              <span className="truncate">Select Machine</span>
            </h3>
            <span className="shrink-0 text-[9px] font-black text-gray-400 md:text-[10px]">
              {collectedCount}/{totalCount}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 md:h-4 md:w-4" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="h-9 rounded-xl border-gray-100 bg-gray-50 pl-9 text-xs transition-all placeholder:text-gray-400 focus:border-violet-500 focus:bg-white md:h-10 md:pl-10 md:text-sm"
          />
        </div>
      </div>

      {/* Machine List */}
      <div className="scrollbar-thin scrollbar-thumb-gray-200 flex-1 overflow-y-auto px-3 py-4 md:px-4 md:pb-6">
        <div className="grid grid-cols-1 gap-2.5">
          {filteredMachines.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-gray-100 bg-gray-50 shadow-inner">
                <Search className="h-7 w-7 text-gray-300" />
              </div>
              <h4 className="mb-1 text-sm font-black text-gray-900">
                No Results
              </h4>
              <p className="text-xs font-medium text-gray-400">
                Try adjusting your search term.
              </p>
            </div>
          ) : (
            filteredMachines.map(machine => {
              const isSelected = selectedMachineId === machine._id;
              const isCollected = collectedMachineIds.includes(machine._id);
              const machineLabel =
                machine.custom?.name ||
                `Machine ${machine.assetNumber || machine.serialNumber}`;

              return (
                <div key={machine._id} className="group">
                  <button
                    onClick={() => onSelect(machine._id)}
                    className={cn(
                      'relative w-full rounded-2xl border-2 p-3 text-left transition-all md:p-4',
                      isSelected
                        ? 'border-violet-500 bg-violet-50 shadow-sm ring-1 ring-violet-500/10'
                        : isCollected
                          ? 'border-emerald-100 bg-emerald-50/20 opacity-80'
                          : 'border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-3">
                      <div className="min-w-[120px] flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p
                            className={cn(
                              'truncate text-xs font-black transition-colors md:text-[14px]',
                              isSelected ? 'text-violet-700' : 'text-gray-900'
                            )}
                          >
                            {machineLabel}
                          </p>
                          {isCollected && (
                            <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-emerald-700 md:text-[8px]">
                              Done
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-tighter md:text-[9px]',
                              isSelected
                                ? 'border-violet-200 bg-violet-100 text-violet-700'
                                : 'border-gray-200 bg-gray-100 text-gray-400'
                            )}
                          >
                            {machine.assetNumber || machine.serialNumber}
                          </span>
                        </div>
                      </div>

                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        {/* Quick History Button - Integrated */}
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            onSelect(machine._id);
                            if (onViewHistory) onViewHistory(machine._id);
                          }}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-300 transition-all hover:bg-violet-100 hover:text-violet-500 md:h-8 md:w-8"
                          title="Quick History"
                        >
                          <HistoryIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </div>

                        <div
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-all md:h-8 md:w-8 md:rounded-xl',
                            isCollected
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : isSelected
                                ? 'border-violet-600 bg-violet-600 text-white'
                                : 'border-gray-200 bg-gray-100 text-gray-400 group-hover:border-violet-500 group-hover:bg-violet-50 group-hover:text-violet-500'
                          )}
                        >
                          {isCollected ? (
                            <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          ) : (
                            <Plus
                              className={cn(
                                'h-3.5 w-3.5 transition-transform md:h-4 md:w-4',
                                isSelected && 'rotate-45'
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
