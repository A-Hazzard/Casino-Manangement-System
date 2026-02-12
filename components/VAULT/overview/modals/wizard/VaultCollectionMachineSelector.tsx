/**
 * Vault Collection Machine Selector
 *
 * Left panel component for selecting machines to collect from.
 */
'use client';

import { Input } from '@/components/shared/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
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
    <div className="flex flex-col h-full border-r border-gray-200 bg-white w-1/4 min-w-[280px]">
      {/* Header & Search */}
      <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
           <Monitor className="h-4 w-4 text-violet-600" />
           Select Machine
           <span className="text-xs font-normal text-gray-500 ml-auto bg-white px-2 py-0.5 rounded-full border border-gray-200">
             {filteredMachines.length}
           </span>
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by Asset, Serial..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm bg-white border-gray-200 focus:border-violet-500 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Machine List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {filteredMachines.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
               <Search className="h-8 w-8 mb-2 opacity-50" />
               <p className="text-sm">No machines found</p>
            </div>
          ) : (
            filteredMachines.map((machine) => {
              const isSelected = selectedMachineId === machine._id;
              const isCollected = collectedMachineIds.includes(machine._id);

              return (
                <button
                  key={machine._id}
                  onClick={() => onSelect(machine._id)}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg text-sm transition-all relative group border",
                    isSelected
                      ? "bg-violet-50 border-violet-200 text-violet-900 shadow-sm z-10"
                      : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700"
                  )}
                  disabled={isCollected && !isSelected} // Can't re-select purely to add logic? Maybe for editing.
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium truncate", isSelected ? "text-violet-700" : "text-gray-900")}>
                        {machine.custom?.name || `Machine ${machine.serialNumber}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wide text-gray-600">
                           {machine.assetNumber || 'No Asset #'}
                        </span>
                        {machine.locationName && (
                           <span className="truncate max-w-[100px] text-gray-400">
                             • {machine.locationName}
                           </span>
                        )}
                      </div>
                    </div>

                    {isCollected ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                             <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200 shadow-sm">
                               <Check className="h-3.5 w-3.5" />
                             </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Already collected in this session</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                         isSelected 
                           ? "bg-violet-200 text-violet-700" 
                           : "bg-gray-100 text-gray-400 group-hover:bg-violet-100 group-hover:text-violet-600"
                      )}>
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  
                  {isSelected && (
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-l-lg" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
