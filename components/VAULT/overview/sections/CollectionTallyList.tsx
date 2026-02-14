/**
 * Collection Tally List Component
 *
 * Displays a list of all machines and their collection status for the day.
 * Used in the End-of-Day / Vault Closure process to ensure full floor coverage.
 */
'use client';

import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { CheckCircle2, History, Loader2, Monitor, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TallyItem {
  machineId: string;
  location: string;
  closingCount: number;
  collected: boolean;
}

interface CollectionTallyListProps {
  locationId: string;
  date?: string; // defaults to today
}

export default function CollectionTallyList({
  locationId,
  date = new Date().toISOString().split('T')[0]
}: CollectionTallyListProps) {
  const { formatAmount } = useCurrencyFormat();
  const [tally, setTally] = useState<TallyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId) return;

    const fetchTally = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/vault/end-of-day?locationId=${locationId}&date=${date}`);
        const result = await res.json();
        if (result.success && result.data) {
          setTally(result.data.slotCounts || []);
        }
      } catch (error) {
        console.error('Failed to fetch collection tally:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTally();
  }, [locationId, date]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mb-2 text-violet-400" />
        <p className="text-xs font-medium uppercase tracking-widest opacity-50">Syncing Collection Data...</p>
      </div>
    );
  }

  const collectedCount = tally.filter(t => t.collected).length;
  const isComplete = collectedCount === tally.length && tally.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
           <History className="h-4 w-4 text-violet-600" />
           <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Machine Collection Tally</span>
        </div>
        <div className={cn(
          "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
          isComplete ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
        )}>
          {collectedCount} / {tally.length} Collected
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {tally.length === 0 ? (
          <div className="col-span-2 text-center py-6 text-gray-400 italic text-xs bg-gray-50 rounded-xl border border-dashed">
            No machines registered at this location.
          </div>
        ) : (
          tally.map((item) => (
            <div 
              key={item.machineId}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                item.collected 
                  ? "bg-emerald-50/30 border-emerald-100" 
                  : "bg-orange-50/30 border-orange-100 grayscale-[0.5] opacity-80"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm font-black text-[10px]",
                  item.collected ? "bg-white text-emerald-600 border border-emerald-100" : "bg-white text-orange-400 border border-orange-100"
                )}>
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                   <span className="text-xs font-black text-gray-800 truncate max-w-[120px]">{item.location}</span>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                     {item.collected ? formatAmount(item.closingCount) : 'Pending Collection'}
                   </span>
                </div>
              </div>
              
              {item.collected ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-orange-300" />
              )}
            </div>
          ))
        )}
      </div>

      {!isComplete && tally.length > 0 && (
         <div className="bg-orange-100/50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <XCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-800 leading-tight">
               <span className="font-black uppercase tracking-tighter block mb-0.5">Coverage Warning</span>
               There are {tally.length - collectedCount} machines that have not been collected today. Please verify if they should be included before final vault closure.
            </p>
         </div>
      )}
    </div>
  );
}
