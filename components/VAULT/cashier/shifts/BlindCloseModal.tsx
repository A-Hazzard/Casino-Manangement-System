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
import { Label } from '@/components/shared/ui/label';
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
          <div className="grid grid-cols-2 gap-4">
            {denominations.map((denom, index) => (
              <div key={denom.denomination} className="space-y-2">
                <Label className="text-sm font-medium">
                  ${denom.denomination} Bills
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                    className="w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(index, denom.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 bg-gray-50 -mx-6 px-6 pb-4 -mb-4 rounded-b-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Your Count:</span>
              <span
                className={cn(
                  'text-lg font-bold',
                  totalAmount > 0 ? 'text-blue-600' : 'text-gray-500'
                )}
              >
                {formatAmount(totalAmount)}
              </span>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              Ensure this matches your physical drawer exactly.
            </p>
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
