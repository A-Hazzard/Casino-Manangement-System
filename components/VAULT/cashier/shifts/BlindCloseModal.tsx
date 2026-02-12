/**
 * Blind Close Modal Component
 * 
 * CRITICAL SECURITY COMPONENT (C-4)
 * Allows cashier to enter physical cash count by denomination to close their shift.
 * 
 * SECURITY RULE:
 * This component MUST NOT calculate or display any "Expected Balance" or "Difference".
 * It strictly captures the physical count for blind verification by the backend.
 * 
 * @module components/VAULT/cashier/shifts/BlindCloseModal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

type BlindCloseModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (physicalCount: number, denominations: Denomination[]) => Promise<void>;
  loading?: boolean;
};

const DEFAULT_DENOMINATIONS: Denomination['denomination'][] = [
  1, 5, 10, 20, 50, 100,
];

export default function BlindCloseModal({
  open,
  onClose,
  onSubmit,
  loading = false,
}: BlindCloseModalProps) {
  const { formatAmount } = useCurrencyFormat();

  const [denominations, setDenominations] = useState<Denomination[]>(
    DEFAULT_DENOMINATIONS.map((denom) => ({ denomination: denom, quantity: 0 }))
  );

  const totalAmount = denominations.reduce(
    (sum, d) => sum + d.denomination * d.quantity,
    0
  );

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenominations = [...denominations];
    newDenominations[index] = { ...newDenominations[index], quantity };
    setDenominations(newDenominations as Denomination[]);
  };

  const handleSubmit = async () => {
    const filteredDenominations = denominations.filter((d) => d.quantity > 0);
    // Even if 0, we allow close (maybe they lost everything?), but usually user should enter something.
    // We'll proceed with 0 if that's the count.
    
    try {
      await onSubmit(totalAmount, filteredDenominations);
      // Don't close immediately here? The parent handles it?
      // Usually parent calls onClose on success
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <AlertTriangle className="h-5 w-5 text-violet-600" />
            End Shift / Blind Close
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Enter your final physical cash count for manager review and shift closure.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
           <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                 <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="space-y-0.5">
                 <p className="text-xs font-black uppercase tracking-widest text-amber-700">Security Protocol</p>
                 <p className="text-sm text-amber-600 font-medium leading-tight">
                    For security, the expected balance is hidden. Please count carefully.
                 </p>
              </div>
           </div>

          <div className="grid grid-cols-1 gap-3">
            {denominations.map((denom, index) => (
              <div 
                key={denom.denomination} 
                className={cn(
                  "relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                  denom.quantity > 0 
                    ? "bg-violet-50/50 border-violet-200 ring-1 ring-violet-100 shadow-sm" 
                    : "bg-gray-50/30 border-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm font-black text-sm",
                    denom.quantity > 0 ? "text-violet-600 border border-violet-100" : "text-gray-400 border border-transparent"
                  )}>
                    ${denom.denomination}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bills</span>
                    <span className="text-xs font-bold text-gray-700">Physical Count</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-gray-100 text-gray-500 rounded-md"
                    onClick={() => updateQuantity(index, denom.quantity - 1)}
                    disabled={denom.quantity === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <Input
                    type="number"
                    min="0"
                    value={denom.quantity}
                    onChange={(e) =>
                      updateQuantity(index, parseInt(e.target.value) || 0)
                    }
                    className="w-12 h-8 border-none bg-transparent text-center font-black p-0 focus-visible:ring-0 text-sm"
                  />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-gray-100 text-gray-500 rounded-md"
                    onClick={() => updateQuantity(index, denom.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-600 to-purple-700 shadow-xl shadow-violet-500/20 text-white relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-100/60">Session physical count</span>
                <span className="text-sm font-bold block">Total Cash Recorded</span>
              </div>
              <span className="text-3xl font-black tracking-tight text-white">
                {formatAmount(totalAmount)}
              </span>
            </div>
            <div className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12 bg-white/10 rounded-full blur-2xl" />
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="font-black text-gray-500 hover:bg-gray-100/50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-violet-600 text-white hover:bg-violet-700 font-black shadow-lg shadow-violet-600/20 px-8"
          >
            {loading ? 'Submitting count...' : 'Finalize & Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
