/**
 * Vault Denomination Modal Component
 *
 * A view-only modal to show the breakdown of currency for a specific shift or desk.
 *
 * @module components/VAULT/overview/modals/VaultDenominationModal
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

type VaultDenominationModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  denominations: Denomination[];
  totalAmount: number;
};

export default function VaultDenominationModal({
  open,
  onClose,
  title,
  denominations,
  totalAmount,
}: VaultDenominationModalProps) {
  const { formatAmount } = useCurrencyFormat();

  // Filter out zero quantities for cleaner view
  const activeDenoms = denominations.filter((d) => d.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
           <DialogTitle className="flex items-center gap-2 text-violet-900">
             <Banknote className="h-5 w-5 text-violet-600" />
             {title}
           </DialogTitle>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-5 shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Total Balance</p>
              <p className="text-2xl font-black text-violet-700 tracking-tight">{formatAmount(totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Status</p>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-100 text-[10px] font-black uppercase text-violet-700">
                 <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                 Active Float
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Denomination Breakdown</Label>
            <div className="divide-y divide-violet-100 rounded-2xl border border-violet-100 bg-white overflow-hidden shadow-sm">
              {activeDenoms.length > 0 ? (
                activeDenoms.map((d) => (
                  <div key={d.denomination} className="flex items-center justify-between p-4 hover:bg-violet-50/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 font-black text-xs border border-violet-100 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-all">
                        ${d.denomination}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 tracking-tight">
                          {d.quantity} Bills
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          Currency Unit
                        </p>
                      </div>
                    </div>
                    <p className="font-black text-sm text-violet-700">
                      {formatAmount(d.denomination * d.quantity)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Banknote className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-bold text-sm uppercase tracking-tight">No denominations recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
