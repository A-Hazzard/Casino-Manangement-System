/**
 * Vault Overview Collection Session List Component
 *
 * Right panel showing list of machines added to the current session.
 * 
 * @module components/VAULT/overview/modals/wizard/VaultOverviewCollectionSessionList
 */
'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { ListChecks, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface VaultCollectionEntry {
  machineId: string;
  machineName: string;
  totalAmount: number;
  expectedDrop?: number;
  variance?: number;
  notes?: string;
}

interface VaultOverviewCollectionSessionListProps {
  entries: VaultCollectionEntry[];
  onRemove: (machineId: string) => void;
  onEdit?: (machineId: string) => void;
  onSelect?: (machineId: string) => void;
  containerClassName?: string;
  totalLabel?: string;
  selectedMachineId?: string | null;
}

export default function VaultOverviewCollectionSessionList({
  entries,
  onRemove,
  onEdit: _onEdit,
  onSelect,
  containerClassName,
  totalLabel = "Total Collected",
  selectedMachineId
}: VaultOverviewCollectionSessionListProps) {
  const { formatAmount } = useCurrencyFormat();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const totalCollected = entries.reduce((acc, curr) => acc + curr.totalAmount, 0);

  const confirmDelete = () => {
    if (itemToDelete) {
      onRemove(itemToDelete);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <div className={cn(
        "flex flex-col h-full bg-white",
        containerClassName
      )}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
             <ListChecks className="h-4 w-4 text-violet-500" />
             Session Summary
             <span className="text-[10px] font-black text-gray-400 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border border-gray-100 bg-gray-50/50">
               {entries.length}
             </span>
          </h3>
        </div>
  
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <div className="p-4 space-y-3">
             {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700">
                   <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 transition-transform hover:scale-110">
                      <ListChecks className="h-8 w-8 text-gray-200" />
                   </div>
                   <p className="text-xs font-bold text-gray-400">No machines added yet</p>
                   <p className="text-[10px] text-gray-300 mt-2 max-w-[180px] leading-relaxed">
                     Select a machine and enter counts to build your collection list.
                   </p>
                </div>
             ) : (
                entries.map((entry) => (
                  <div 
                    key={entry.machineId}
                    onClick={() => onSelect?.(entry.machineId)}
                    className={cn(
                      "bg-white rounded-xl p-4 border transition-all duration-200 relative group cursor-pointer",
                      selectedMachineId === entry.machineId 
                        ? "border-violet-500 shadow-md bg-violet-50/10 ring-1 ring-violet-500/10" 
                        : "border-gray-100 shadow-sm hover:border-violet-200 hover:shadow-md"
                    )}
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                       <h4 className="flex-1 text-[13px] font-black text-gray-800 line-clamp-2 tracking-tight min-w-[120px]">
                         {entry.machineName || 'Unknown Machine'}
                       </h4>
                       <span className="text-sm font-black text-gray-900 shrink-0">
                         {formatAmount(entry.totalAmount)}
                       </span>
                    </div>
                    
                    {/* Comparison Row */}
                    <div className="grid grid-cols-2 gap-2 mt-2 mb-2">
                       <div className="bg-gray-50 rounded-lg p-1.5 border border-gray-100/50">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-tight mb-0.5">Physical Count</p>
                          <p className="text-[10px] md:text-[11px] font-bold text-gray-700">{formatAmount(entry.totalAmount)}</p>
                       </div>
                       <div className="bg-gray-50 rounded-lg p-1.5 border border-gray-100/50">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-tight mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Expected</p>
                          <p className="text-[10px] md:text-[11px] font-bold text-gray-700">{entry.expectedDrop !== undefined ? formatAmount(entry.expectedDrop) : '--'}</p>
                       </div>
                    </div>

                    {/* Variance Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-tight">
                       <div className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-md shrink-0",
                          entry.variance === 0 ? "bg-emerald-50 text-emerald-600" :
                          (entry.variance || 0) > 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                       )}>
                          <span>Var:</span>
                          <span>{entry.variance !== undefined ? (entry.variance > 0 ? '+' : '') + formatAmount(entry.variance) : '--'}</span>
                       </div>

                       {entry.notes && (
                         <span className="italic truncate text-gray-300 max-w-[80px] text-[9px]" title={entry.notes}>
                           {entry.notes}
                         </span>
                       )}
                    </div>
  
                    {/* Actions Overlay (Integrated) */}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setItemToDelete(entry.machineId);
                         }}
                         className="h-8 md:h-7 px-3 md:px-2 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100 hover:border-red-100 gap-1.5"
                         title="Remove Entry"
                       >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="md:hidden text-[10px] font-black uppercase">Remove</span>
                       </button>
                    </div>
                  </div>
                ))
             )}
          </div>
        </div>
  
        <div className="p-8 border-t border-gray-100 bg-white">
           <div className="flex justify-between items-end gap-4 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{totalLabel}</span>
                <span className={cn(
                    "font-black text-gray-900 tracking-tighter leading-none block transition-all",
                    formatAmount(totalCollected).length > 18 ? 'text-lg' :
                    formatAmount(totalCollected).length > 15 ? 'text-xl' :
                    formatAmount(totalCollected).length > 12 ? 'text-2xl' : 'text-3xl'
                )}>
                  {formatAmount(totalCollected)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {entries.length} {entries.length === 1 ? 'machine' : 'machines'}
                </p>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tight mt-0.5">Processed</p>
              </div>
           </div>
        </div>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this machine from the current session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
