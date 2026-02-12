/**
 * Vault Collection Session List
 *
 * Right panel showing list of machines added to the current session.
 */
'use client';

import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { Edit2, ListChecks, Trash2 } from 'lucide-react';

interface VaultCollectionEntry {
  machineId: string;
  machineName: string;
  totalAmount: number;
  variance?: number;
  notes?: string;
}

interface VaultCollectionSessionListProps {
  entries: VaultCollectionEntry[];
  onRemove: (machineId: string) => void;
  onEdit?: (machineId: string) => void;
}

export default function VaultCollectionSessionList({
  entries,
  onRemove,
  onEdit
}: VaultCollectionSessionListProps) {
  const { formatAmount } = useCurrencyFormat();
  
  const totalCollected = entries.reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="w-1/4 min-w-[300px] border-l border-gray-200 bg-white flex flex-col h-full shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] z-10">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-violet-50/30">
        <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-2">
           <ListChecks className="h-4 w-4 text-violet-600" />
           Session Summary
           <span className="bg-white px-2 py-0.5 rounded-full text-xs border border-violet-100 text-violet-600 font-bold">
             {entries.length}
           </span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="p-3 space-y-3">
           {entries.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 mt-10">
                <ListChecks className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No machines added yet</p>
                <p className="text-xs mt-1 max-w-[180px]">Select a machine and enter counts to build your collection list.</p>
             </div>
           ) : (
             entries.map((entry) => (
               <div 
                 key={entry.machineId}
                 className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm relative group hover:border-violet-200 hover:shadow transition-all"
               >
                 <div className="flex justify-between items-start mb-1">
                   <h4 className="text-sm font-bold text-gray-800 line-clamp-1 pr-6">
                     {entry.machineName || 'Unknown Machine'}
                   </h4>
                   <span className="text-sm font-black text-emerald-600">
                     {formatAmount(entry.totalAmount)}
                   </span>
                 </div>
                 
                 {/* Metadata Row */}
                 <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    {entry.variance !== undefined && entry.variance !== 0 && (
                      <span className={cn(
                        "flex items-center gap-1 font-medium",
                        entry.variance > 0 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {entry.variance > 0 ? '+' : ''}{formatAmount(entry.variance)} Var
                      </span>
                    )}
                    {entry.notes && (
                      <span className="italic max-w-[120px] truncate" title={entry.notes}>
                        "{entry.notes}"
                      </span>
                    )}
                 </div>

                 {/* Actions Overlay (Hover) */}
                 <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button 
                        onClick={() => onEdit(entry.machineId)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit Entry"
                      >
                         <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Remove this machine from the current session?')) {
                          onRemove(entry.machineId);
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove Entry"
                    >
                       <Trash2 className="h-3.5 w-3.5" />
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>

      {/* Footer Total */}
      <div className="p-5 border-t border-gray-200 bg-white">
         <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Collected</span>
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              {formatAmount(totalCollected)}
            </span>
         </div>
         <p className="text-xs text-right text-gray-400">
           {entries.length} machines processed
         </p>
      </div>
    </div>
  );
}
