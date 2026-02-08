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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>End Shift / Blind Close</DialogTitle>
          <DialogDescription>
            Enter your physical cash count.
            <br />
            <span className="font-semibold text-amber-600 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-4 w-4" />
              For security, the expected balance is hidden.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
            {denominations.map((denom, index) => (
              <div 
                key={denom.denomination} 
                className={cn(
                  "relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                  denom.quantity > 0 
                    ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-100 shadow-sm" 
                    : "bg-gray-50/30 border-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm font-black text-sm",
                    denom.quantity > 0 ? "text-indigo-600 border border-indigo-100" : "text-gray-400 border border-transparent"
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

          <div className="bg-gradient-to-r from-gray-900 to-indigo-900 rounded-2xl p-5 shadow-xl shadow-indigo-900/20">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Total Recorded</span>
                <p className="text-white/60 text-[10px]">Blind submission for verification</p>
              </div>
              <span className="text-3xl font-black text-white tracking-tight">
                {formatAmount(totalAmount)}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
               <AlertTriangle className="h-3 w-3" />
               Submission is final and verified by manager
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? 'Closing Shift...' : 'Confirm Count & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
