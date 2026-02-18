/**
 * Vault Collection Machine History Component
 *
 * Right panel component for displaying historical collections for a specific machine.
 */
'use client';

import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { Clock, History as HistoryIcon, Loader2, User } from 'lucide-react';

interface VaultCollectionMachineHistoryProps {
  history: any[];
  loading: boolean;
  machineName: string;
  containerClassName?: string;
}

export default function VaultCollectionMachineHistory({
  history,
  loading,
  machineName,
  containerClassName
}: VaultCollectionMachineHistoryProps) {
  const { formatAmount } = useCurrencyFormat();

  return (
    <div className={cn(
      "w-1/4 min-w-[300px] border-l border-gray-200 bg-white flex flex-col h-full shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] z-10 animate-in slide-in-from-right-2 duration-300",
      containerClassName
    )}>
      <div className="p-4 border-b border-gray-100 bg-violet-50/30">
        <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-2">
           <HistoryIcon className="h-4 w-4 text-violet-600" />
           Machine History
        </h3>
        <p className="text-[11px] text-violet-700/70 font-medium truncate mt-0.5">
          {machineName}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
               <Loader2 className="h-8 w-8 animate-spin mb-3 text-violet-400" />
               <p className="text-xs font-medium">Loading history...</p>
            </div>
          ) : !machineName || machineName === 'Machine' ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400 py-20">
               <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <HistoryIcon className="h-8 w-8 text-gray-200" />
               </div>
               <p className="text-sm font-black text-gray-900 mb-1">No Selection</p>
               <p className="text-[11px] font-medium text-gray-400 max-w-[180px]">
                 Select a machine from the list or batch list to view its collection history.
               </p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400 bg-white rounded-xl border border-gray-100 mt-4">
               <Clock className="h-10 w-10 mb-3 opacity-20" />
               <p className="text-sm font-medium">No History</p>
               <p className="text-[11px] mt-1">No previous collection records found for this machine.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, idx) => (
                <div 
                  key={item._id}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-violet-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-tighter">
                      {new Date(item.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <Badge icon={<User />} name={item.performedBy?.username || item.performedBy || 'System'} />
                  </div>
                  
                  <div className="flex items-center justify-between min-w-0">
                     <span className={cn(
                         "font-black text-gray-900 truncate transition-all",
                         formatAmount(item.amount).length > 12 ? 'text-base' : 'text-lg'
                     )}>
                       {formatAmount(item.amount)}
                     </span>
                  </div>
                  
                  {item.notes && (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                       <p className="text-[10px] text-gray-500 italic leading-relaxed line-clamp-2">
                         "{item.notes}"
                       </p>
                    </div>
                  )}

                  {idx === 0 && (
                    <div className="absolute top-0 right-0 h-1.5 w-8 bg-violet-600 rounded-bl-lg" />
                  )}
                </div>
              ))}
              
              <div className="text-center pt-2">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  Showing Last 5 Collections
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-amber-50/50">
         <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-tight">
              Compare current physical counts with historical collection patterns to identify potential feeder issues or discrepancies.
            </p>
         </div>
      </div>
    </div>
  );
}

// Internal Badge Component for simplified usage
function Badge({ icon, name }: { icon: React.ReactNode, name: string }) {
  return (
    <div className="flex items-center gap-1 text-[9px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
      {icon}
      <span className="truncate max-w-[80px]">{name}</span>
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  );
}
