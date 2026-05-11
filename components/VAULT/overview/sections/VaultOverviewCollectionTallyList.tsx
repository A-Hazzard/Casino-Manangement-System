/**
 * Vault Overview Collection Tally List Component
 *
 * Displays a list of all machines and their collection status for the day.
 * Used in the End-of-Day / Vault Closure process to ensure full floor coverage.
 *
 * @module components/VAULT/overview/sections/VaultOverviewCollectionTallyList
 */
'use client';

import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { CheckCircle2, History, Monitor, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TallyItem {
  machineId: string;
  location: string;
  closingCount: number;
  collected: boolean;
}

interface VaultOverviewCollectionTallyListProps {
  locationId: string;
  date?: string; // defaults to today
}

export default function VaultOverviewCollectionTallyList({
  locationId,
  date = new Date().toLocaleDateString('en-CA'), // Returns YYYY-MM-DD in local time
}: VaultOverviewCollectionTallyListProps) {
  const { formatAmount } = useCurrencyFormat();
  const [tally, setTally] = useState<TallyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId) return;

    const fetchTally = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vault/end-of-day?locationId=${locationId}&date=${date}`
        );
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl border border-dashed bg-gray-50"
          />
        ))}
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
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
            Machine Collection Tally
          </span>
        </div>
        <div
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter',
            isComplete
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-orange-100 text-orange-700'
          )}
        >
          {collectedCount} / {tally.length} Collected
        </div>
      </div>

      <div className="custom-scrollbar grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
        {tally.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-dashed bg-gray-50 py-6 text-center text-xs italic text-gray-400">
            No machines registered at this location.
          </div>
        ) : (
          tally.map(item => (
            <div
              key={item.machineId}
              className={cn(
                'flex items-center justify-between rounded-xl border p-3 transition-all',
                item.collected
                  ? 'border-emerald-100 bg-emerald-50/30'
                  : 'border-orange-100 bg-orange-50/30 opacity-80 grayscale-[0.5]'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black shadow-sm',
                    item.collected
                      ? 'border border-emerald-100 bg-white text-emerald-600'
                      : 'border border-orange-100 bg-white text-orange-400'
                  )}
                >
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="max-w-[120px] truncate text-xs font-black text-gray-800">
                    {item.location}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">
                    {item.collected
                      ? formatAmount(item.closingCount)
                      : 'Pending Collection'}
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
        <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-100/50 p-3">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <p className="text-[10px] leading-tight text-orange-800">
            <span className="mb-0.5 block font-black uppercase tracking-tighter">
              Coverage Warning
            </span>
            There are {tally.length - collectedCount} machines that have not
            been collected today. Please verify if they should be included
            before final vault closure.
          </p>
        </div>
      )}
    </div>
  );
}
