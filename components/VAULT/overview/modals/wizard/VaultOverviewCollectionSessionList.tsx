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
  onSelect,
  containerClassName,
  totalLabel = 'Total Collected',
  selectedMachineId,
}: VaultOverviewCollectionSessionListProps) {
  const { formatAmount } = useCurrencyFormat();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const totalCollected = entries.reduce(
    (acc, curr) => acc + curr.totalAmount,
    0
  );

  const confirmDelete = () => {
    if (itemToDelete) {
      onRemove(itemToDelete);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <div className={cn('flex h-full flex-col bg-white', containerClassName)}>
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-900">
            <ListChecks className="h-4 w-4 text-violet-500" />
            Session Summary
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full border border-gray-100 bg-gray-50/50 px-1.5 text-[10px] font-black text-gray-400">
              {entries.length}
            </span>
          </h3>
        </div>

        <div className="scrollbar-thin scrollbar-thumb-gray-200 flex-1 overflow-y-auto">
          <div className="space-y-3 p-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center duration-700 animate-in fade-in">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 transition-transform hover:scale-110">
                  <ListChecks className="h-8 w-8 text-gray-200" />
                </div>
                <p className="text-xs font-bold text-gray-400">
                  No machines added yet
                </p>
                <p className="mt-2 max-w-[180px] text-[10px] leading-relaxed text-gray-300">
                  Select a machine and enter counts to build your collection
                  list.
                </p>
              </div>
            ) : (
              entries.map(entry => (
                <div
                  key={entry.machineId}
                  onClick={() => onSelect?.(entry.machineId)}
                  className={cn(
                    'group relative cursor-pointer rounded-xl border bg-white p-4 transition-all duration-200',
                    selectedMachineId === entry.machineId
                      ? 'border-violet-500 bg-violet-50/10 shadow-md ring-1 ring-violet-500/10'
                      : 'border-gray-100 shadow-sm hover:border-violet-200 hover:shadow-md'
                  )}
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h4 className="line-clamp-2 min-w-[120px] flex-1 text-[13px] font-black tracking-tight text-gray-800">
                      {entry.machineName || 'Unknown Machine'}
                    </h4>
                    <span className="shrink-0 text-sm font-black text-gray-900">
                      {formatAmount(entry.totalAmount)}
                    </span>
                  </div>

                  {/* Comparison Row */}
                  <div className="mb-2 mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-100/50 bg-gray-50 p-1.5">
                      <p className="mb-0.5 text-[8px] font-black uppercase tracking-tight text-gray-400">
                        Physical Count
                      </p>
                      <p className="text-[10px] font-bold text-gray-700 md:text-[11px]">
                        {formatAmount(entry.totalAmount)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-100/50 bg-gray-50 p-1.5">
                      <p className="mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[8px] font-black uppercase tracking-tight text-gray-400">
                        Expected
                      </p>
                      <p className="text-[10px] font-bold text-gray-700 md:text-[11px]">
                        {entry.expectedDrop !== undefined
                          ? formatAmount(entry.expectedDrop)
                          : '--'}
                      </p>
                    </div>
                  </div>

                  {/* Variance Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-tight">
                    <div
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5',
                        entry.variance === 0
                          ? 'bg-emerald-50 text-emerald-600'
                          : (entry.variance || 0) > 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      <span>Var:</span>
                      <span>
                        {entry.variance !== undefined
                          ? (entry.variance > 0 ? '+' : '') +
                            formatAmount(entry.variance)
                          : '--'}
                      </span>
                    </div>

                    {entry.notes && (
                      <span
                        className="max-w-[80px] truncate text-[9px] italic text-gray-300"
                        title={entry.notes}
                      >
                        {entry.notes}
                      </span>
                    )}
                  </div>

                  {/* Actions Overlay (Integrated) */}
                  <div className="mt-3 flex justify-end gap-1 border-t border-gray-50 pt-3 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setItemToDelete(entry.machineId);
                      }}
                      className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 md:h-7 md:px-2"
                      title="Remove Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-black uppercase md:hidden">
                        Remove
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white p-8">
          <div className="flex min-w-0 items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                {totalLabel}
              </span>
              <span
                className={cn(
                  'block font-black leading-none tracking-tighter text-gray-900 transition-all',
                  formatAmount(totalCollected).length > 18
                    ? 'text-lg'
                    : formatAmount(totalCollected).length > 15
                      ? 'text-xl'
                      : formatAmount(totalCollected).length > 12
                        ? 'text-2xl'
                        : 'text-3xl'
                )}
              >
                {formatAmount(totalCollected)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {entries.length} {entries.length === 1 ? 'machine' : 'machines'}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-tight text-gray-300">
                Processed
              </p>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={open => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this machine from the current
              session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
