/**
 * View Denominations Modal
 * 
 * Displays the denomination breakdown for a specific cash desk or vault.
 * 
 * @module components/VAULT/overview/modals/ViewDenominationsModal
 */

'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { Denomination } from '@/shared/types/vault';
import { Coins, Receipt } from 'lucide-react';

type ViewDenominationsModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  denominations: Denomination[];
  totalAmount: number;
};

export default function ViewDenominationsModal({
  open,
  onClose,
  title,
  denominations = [],
  totalAmount,
}: ViewDenominationsModalProps) {
  const { formatAmount } = useCurrencyFormat();

  // Ensure all denominations are present even if quantity is 0
  const standardDenoms = [100, 50, 20, 10, 5, 1];
  const displayDenoms = standardDenoms.map(val => {
    const found = denominations.find(d => d.denomination === val);
    return {
      denomination: val,
      quantity: found ? found.quantity : 0
    };
  });

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-emerald-50 border-b border-emerald-100">
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <Coins className="h-5 w-5 text-emerald-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {displayDenoms.map((d) => (
              <div 
                key={d.denomination} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  d.quantity > 0 ? "bg-white border-emerald-100 shadow-sm" : "bg-gray-50/50 border-gray-100 opacity-60"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 font-black text-[10px]",
                    d.quantity > 0 ? "text-emerald-600 border border-emerald-100" : "text-gray-400 border border-transparent"
                  )}>
                    ${d.denomination}
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Bills</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900 leading-none">x{d.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 shadow-xl shadow-emerald-500/20 text-white">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60 mb-0.5">Verified Total Balance</p>
                <span className="text-3xl font-black tracking-tight">{formatAmount(totalAmount)}</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <Receipt className="h-6 w-6 text-emerald-100" />
              </div>
            </div>
            <Coins className="absolute -right-4 -bottom-4 h-20 w-20 text-white/5 rotate-12" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
