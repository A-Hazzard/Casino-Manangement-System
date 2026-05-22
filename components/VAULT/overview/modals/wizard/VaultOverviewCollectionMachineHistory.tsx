/**
 * Vault Overview Collection Machine History Component
 *
 * Right panel component for displaying historical collections for a specific machine.
 *
 * @module components/VAULT/overview/modals/wizard/VaultOverviewCollectionMachineHistory
 */
'use client';

import { ReactNode } from 'react';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { MachineCollectionActivity } from '@/shared/types/vault';
import { Clock, History as HistoryIcon, Loader2, User } from 'lucide-react';

interface VaultOverviewCollectionMachineHistoryProps {
  history: MachineCollectionActivity[];
  loading: boolean;
  machineName: string;
  containerClassName?: string;
}

export default function VaultOverviewCollectionMachineHistory({
  history,
  loading,
  machineName,
  containerClassName,
}: VaultOverviewCollectionMachineHistoryProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      className={cn(
        'z-10 flex h-full w-1/4 min-w-[300px] flex-col border-l border-gray-200 bg-white shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] duration-300 animate-in slide-in-from-right-2',
        containerClassName
      )}
    >
      <div className="border-b border-gray-100 bg-violet-50/30 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-900">
          <HistoryIcon className="h-4 w-4 text-violet-600" />
          Machine History
        </h3>
        <p className="mt-0.5 truncate text-[11px] font-medium text-violet-700/70">
          {machineName}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="space-y-4 p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-400" />
              <p className="text-xs font-medium">Loading history...</p>
            </div>
          ) : !machineName || machineName === 'Machine' ? (
            <div className="flex flex-col items-center justify-center p-10 py-20 text-center text-gray-400">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <HistoryIcon className="h-8 w-8 text-gray-200" />
              </div>
              <p className="mb-1 text-sm font-black text-gray-900">
                No Selection
              </p>
              <p className="max-w-[180px] text-[11px] font-medium text-gray-400">
                Select a machine from the list or batch list to view its
                collection history.
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-10 text-center text-gray-400">
              <Clock className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">No History</p>
              <p className="mt-1 text-[11px]">
                No previous collection records found for this machine.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, idx) => (
                <div
                  key={item._id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-violet-200"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                      {new Date(item.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge
                      icon={<User className="h-2.5 w-2.5" />}
                      name={
                        typeof item.performedBy === 'object'
                          ? item.performedBy.username
                          : item.performedBy || 'System'
                      }
                    />
                  </div>

                  <div className="flex min-w-0 items-center justify-between">
                    <span
                      className={cn(
                        'truncate font-black text-gray-900 transition-all',
                        formatAmount(item.amount).length > 12
                          ? 'text-base'
                          : 'text-lg'
                      )}
                    >
                      {formatAmount(item.amount)}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="mt-2 border-t border-gray-50 pt-2">
                      <p className="line-clamp-2 text-[10px] italic leading-relaxed text-gray-500">
                        "{item.notes}"
                      </p>
                    </div>
                  )}

                  {idx === 0 && (
                    <div className="absolute right-0 top-0 h-1.5 w-8 rounded-bl-lg bg-violet-600" />
                  )}
                </div>
              ))}

              <div className="pt-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  Showing Last 5 Collections
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 bg-amber-50/50 p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[10px] leading-tight text-amber-800">
            Compare current physical counts with historical collection patterns
            to identify potential feeder issues or discrepancies.
          </p>
        </div>
      </div>
    </div>
  );
}

// Internal Badge Component for simplified usage
function Badge({ icon, name }: { icon: ReactNode; name: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-600">
      {icon}
      <span className="max-w-[80px] truncate">{name}</span>
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
