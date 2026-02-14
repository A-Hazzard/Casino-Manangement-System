/**
 * Vault Collection Machine Selector
 *
 * Left panel component for selecting machines to collect from.
 */
'use client';

import { Input } from '@/components/shared/ui/input';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import { Check, Monitor, Plus, Search } from 'lucide-react';
import { useMemo } from 'react';

interface VaultCollectionMachineSelectorProps {
  machines: GamingMachine[];
  selectedMachineId: string | null;
  collectedMachineIds: string[];
  onSelect: (machineId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function VaultCollectionMachineSelector({
  machines,
  selectedMachineId,
  collectedMachineIds,
  onSelect,
  searchTerm,
onSearchChange,
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

  return (
    <div className="flex flex-col h-full border-r border-gray-100 bg-white w-1/4 min-w-[300px]">
      {/* Header & Search */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-violet-500" />
              Select Machine
           </h3>
           <span className="text-[10px] font-black text-gray-400 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border border-gray-100 bg-gray-50/50">
             {filteredMachines.length}
           </span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by Asset, Serial..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 text-sm bg-gray-50/50 border-gray-200/60 rounded-xl focus:bg-white focus:border-violet-500 transition-all placeholder:text-gray-400 placeholder:text-xs"
          />
        </div>
      </div>

      {/* Machine List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-gray-200">
        <div className="space-y-0.5">
          {filteredMachines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
               <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                 <Search className="h-6 w-6 text-gray-300" />
               </div>
               <p className="text-xs font-bold text-gray-400">No matching machines</p>
            </div>
          ) : (
            filteredMachines.map((machine) => {
              const isSelected = selectedMachineId === machine._id;
              const isCollected = collectedMachineIds.includes(machine._id);
              const machineLabel = machine.custom?.name || `Machine ${machine.assetNumber || machine.serialNumber}`;

              return (
                <button
                  key={machine._id}
                  onClick={() => onSelect(machine._id)}
                  className={cn(
                    "w-full text-left px-4 py-4 rounded-xl text-sm transition-all group relative border-2 border-transparent",
                    isSelected
                      ? "bg-violet-50/80 border-violet-100 shadow-sm shadow-violet-500/5"
                      : "hover:bg-gray-50/80"
                  )}
                  disabled={isCollected && !isSelected}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[13px] font-bold truncate transition-colors", 
                        isSelected ? "text-violet-700" : "text-gray-900"
                      )}>
                        {machineLabel}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-bold font-mono text-gray-400 uppercase tracking-tighter bg-gray-100/80 px-1 rounded">
                           {machine.assetNumber || machine.serialNumber}
                        </span>
                        <span className="text-[10px] font-bold text-gray-300">
                          • {machine.locationName || 'Forest View'}
                        </span>
                      </div>
                    </div>

                    {isCollected ? (
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
                         <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center transition-all shrink-0 border",
                         isSelected 
                           ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/20" 
                           : "bg-white border-gray-100 text-gray-300 group-hover:border-violet-200 group-hover:text-violet-500"
                      )}>
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
