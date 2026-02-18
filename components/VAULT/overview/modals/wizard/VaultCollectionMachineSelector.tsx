/**
 * Vault Collection Machine Selector
 *
 * Left panel component for selecting machines to collect from.
 * Includes a progress summary and quick history access.
 */
'use client';

import { Input } from '@/components/shared/ui/input';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import { Check, History as HistoryIcon, Monitor, Plus, Search } from 'lucide-react';
import { useMemo } from 'react';

interface VaultCollectionMachineSelectorProps {
  machines: GamingMachine[];
  selectedMachineId: string | null;
  collectedMachineIds: string[];
  onSelect: (machineId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onViewHistory?: (machineId: string) => void;
}

export default function VaultCollectionMachineSelector({
  machines,
  selectedMachineId,
  collectedMachineIds,
  onSelect,
  searchTerm,
  onSearchChange,
  onViewHistory,
}: VaultCollectionMachineSelectorProps) {
  
  const filteredMachines = useMemo(() => {
    if (!searchTerm) return machines;
    const lowerTerm = searchTerm.toLowerCase();
    return machines.filter(
      (m) =>
        m.custom?.name.toLowerCase().includes(lowerTerm) ||
        m.serialNumber?.toLowerCase().includes(lowerTerm) ||
        m.assetNumber?.toLowerCase().includes(lowerTerm) ||
        m.locationName?.toLowerCase().includes(lowerTerm)
    );
  }, [machines, searchTerm]);

  const collectedCount = collectedMachineIds.length;
  const totalCount = machines.length;
  const percentComplete = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full border-r border-gray-100 bg-white w-full md:w-1/4 md:min-w-[300px] lg:min-w-[350px]">
      {/* Header & Search */}
      <div className="p-5 space-y-4 bg-white sticky top-0 z-10 border-b border-gray-50 shadow-sm">
        <div className="space-y-3">
            <div className="flex items-center justify-between">
               <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-violet-500" />
                  Select Machine
               </h3>
               <span className="text-[10px] font-black text-gray-400">
                 {collectedCount} / {totalCount} Done
               </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-violet-500 transition-all duration-500 ease-out"
                 style={{ width: `${percentComplete}%` }}
               />
            </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by Asset, Serial..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 text-sm bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:border-violet-500 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Machine List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:pb-6 scrollbar-thin scrollbar-thumb-gray-200">
        <div className="grid grid-cols-1 gap-2.5">
          {filteredMachines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
               <div className="h-16 w-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4 border border-gray-100 shadow-inner">
                 <Search className="h-7 w-7 text-gray-300" />
               </div>
               <h4 className="text-sm font-black text-gray-900 mb-1">No Results</h4>
               <p className="text-xs font-medium text-gray-400">Try adjusting your search term.</p>
            </div>
          ) : (
            filteredMachines.map((machine) => {
              const isSelected = selectedMachineId === machine._id;
              const isCollected = collectedMachineIds.includes(machine._id);
              const machineLabel = machine.custom?.name || `Machine ${machine.assetNumber || machine.serialNumber}`;

              return (
                <div key={machine._id} className="relative group">
                    <button
                      onClick={() => onSelect(machine._id)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl transition-all relative border-2",
                        isSelected
                          ? "bg-violet-50 border-violet-500 shadow-sm ring-1 ring-violet-500/10"
                          : isCollected
                            ? "bg-emerald-50/20 border-emerald-100 opacity-80"
                            : "bg-white border-gray-100 hover:border-violet-200 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={cn(
                              "text-[14px] font-black truncate transition-colors", 
                              isSelected ? "text-violet-700" : "text-gray-900"
                            )}>
                              {machineLabel}
                            </p>
                            {isCollected && (
                              <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-emerald-200">
                                Done
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[9px] font-black font-mono px-1.5 py-0.5 rounded-md border uppercase tracking-tighter",
                              isSelected ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-gray-100 text-gray-400 border-gray-200"
                            )}>
                               {machine.assetNumber || machine.serialNumber}
                            </span>
                          </div>
                        </div>

                        <div className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0 border shadow-sm",
                          isCollected 
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : isSelected 
                              ? "bg-violet-600 border-violet-600 text-white" 
                              : "bg-gray-100 border-gray-200 text-gray-400 group-hover:bg-violet-50 group-hover:border-violet-500 group-hover:text-violet-500"
                        )}>
                          {isCollected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className={cn("h-4 w-4 transition-transform", isSelected && "rotate-45")} />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Quick History Button - Always Available */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(machine._id);
                            if (onViewHistory) onViewHistory(machine._id);
                        }}
                        className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-violet-500 transition-colors opacity-0 group-hover:opacity-100 z-20"
                        title="Quick History"
                    >
                        <HistoryIcon className="h-4 w-4" />
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
