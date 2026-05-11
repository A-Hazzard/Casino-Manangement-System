/**
 * Vault Overview Denomination Modal Component
 *
 * A view-only modal to show the breakdown of currency for a specific shift or desk.
 *
 * @module components/VAULT/overview/modals/VaultOverviewDenominationModal
 */
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Label } from '@/components/shared/ui/label';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination } from '@/shared/types/vault';
import { Banknote } from 'lucide-react';

type VaultOverviewDenominationModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  denominations: Denomination[];
  totalAmount: number;
};

export default function VaultOverviewDenominationModal({
  open,
  onClose,
  title,
  denominations,
  totalAmount,
}: VaultOverviewDenominationModalProps) {
  const { formatAmount } = useCurrencyFormat();

  // Filter out zero quantities for cleaner view
  const activeDenoms = denominations.filter(d => d.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-md">
        <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Banknote className="h-5 w-5 text-violet-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:max-h-[75vh]">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-violet-400">
                Total Balance
              </p>
              <p className="text-2xl font-black tracking-tight text-violet-700">
                {formatAmount(totalAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-violet-400">
                Status
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase text-violet-700">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
                Active Float
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400">
              Denomination Breakdown
            </Label>
            <div className="divide-y divide-violet-100 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
              {activeDenoms.length > 0 ? (
                activeDenoms.map(d => (
                  <div
                    key={d.denomination}
                    className="group flex items-center justify-between p-4 transition-colors hover:bg-violet-50/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-xs font-black text-violet-600 transition-all group-hover:border-violet-600 group-hover:bg-violet-600 group-hover:text-white">
                        ${d.denomination}
                      </div>
                      <div>
                        <p className="text-sm font-black tracking-tight text-gray-900">
                          {d.quantity} Bills
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          Currency Unit
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-violet-700">
                      {formatAmount(d.denomination * d.quantity)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Banknote className="mx-auto mb-3 h-8 w-8 text-gray-200" />
                  <p className="text-sm font-bold uppercase tracking-tight text-gray-400">
                    No denominations recorded
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
