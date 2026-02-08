/**
 * Cashier Shift Open Modal Component
 *
 * Modal for opening a new cashier shift by requesting initial float.
 * Allows cashier to specify requested float denominations.
 *
 * @module components/VAULT/cashier/shifts/CashierShiftOpenModal
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
import { toast } from 'sonner';

type CashierShiftOpenModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (denominations: Denomination[]) => Promise<void>;
  hasActiveVaultShift: boolean;
  isVaultReconciled: boolean;
  loading?: boolean;
};

const DEFAULT_DENOMINATIONS: Denomination['denomination'][] = [
  1, 5, 10, 20, 50, 100,
];

export default function CashierShiftOpenModal({
  open,
  onClose,
  onSubmit,
  hasActiveVaultShift,
  isVaultReconciled,
  loading = false,
}: CashierShiftOpenModalProps) {
  const { formatAmount } = useCurrencyFormat();

  const [denominations, setDenominations] = useState<Denomination[]>(
    DEFAULT_DENOMINATIONS.map(denom => ({ denomination: denom, quantity: 0 }))
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
    if (!hasActiveVaultShift) {
      toast.error('No shifts enabled for manager. Please contact your Vault Manager.');
      return;
    }

    if (!isVaultReconciled) {
      toast.error('Vault Not Reconciled', {
        description: 'Please ask a Vault Manager to perform the mandatory opening reconciliation.'
      });
      return;
    }

    const filteredDenominations = denominations.filter(d => d.quantity > 0);
    if (filteredDenominations.length === 0) {
      alert('Please specify at least one denomination with quantity > 0');
      return;
    }
    try {
      await onSubmit(filteredDenominations);
      onClose();
      // Reset form
      setDenominations(
        DEFAULT_DENOMINATIONS.map(denom => ({
          denomination: denom,
          quantity: 0,
        }))
      );
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start New Shift</DialogTitle>
          <DialogDescription>
            Request your opening float by specifying the denominations you need.
          </DialogDescription>
        </DialogHeader>

        {!hasActiveVaultShift && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100 mb-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              <strong>Cannot Start Shift:</strong> No active Vault Manager shift found at this location.
            </p>
          </div>
        )}

        {hasActiveVaultShift && !isVaultReconciled && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700 border border-amber-100 mb-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              <strong>Reconciliation Pending:</strong> The vault manager must reconcile the vault before you can start your shift.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
            {denominations.map((denom, index) => (
              <div 
                key={denom.denomination} 
                className={cn(
                  "relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                  denom.quantity > 0 
                    ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100 shadow-sm" 
                    : "bg-gray-50/30 border-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm font-black text-sm",
                    denom.quantity > 0 ? "text-blue-600 border border-blue-100" : "text-gray-400 border border-transparent"
                  )}>
                    ${denom.denomination}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bills</span>
                    <span className="text-xs font-bold text-gray-700">Denomination</span>
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
                    onChange={e =>
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

          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Total Requested</span>
                <p className="text-white/80 text-[10px]">Sum of all specified denominations</p>
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                {formatAmount(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
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
            disabled={loading || totalAmount === 0}
            className={cn(
              "bg-button text-white hover:bg-button/90",
              (!hasActiveVaultShift || !isVaultReconciled) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Requesting...' : 'Request Float'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
