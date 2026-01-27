/**
 * Cashier Shift Open Modal Component
 *
 * Modal for opening a new cashier shift by requesting initial float.
 * Allows cashier to specify requested float denominations.
 *
 * @module components/VAULT/cashier/shifts/CashierShiftOpenModal
 */

'use client';

import { useState } from 'react';
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
import type { Denomination } from '@/shared/types/vault';
import { cn } from '@/lib/utils';
import { Plus, Minus } from 'lucide-react';

type CashierShiftOpenModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (denominations: Denomination[]) => Promise<void>;
  loading?: boolean;
};

const DEFAULT_DENOMINATIONS: Denomination['denomination'][] = [
  1, 5, 10, 20, 50, 100,
];

export default function CashierShiftOpenModal({
  open,
  onClose,
  onSubmit,
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
                    onChange={e =>
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

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Requested:</span>
              <span
                className={cn(
                  'text-lg font-bold',
                  totalAmount > 0 ? 'text-button' : 'text-gray-500'
                )}
              >
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
            className="bg-button text-white hover:bg-button/90"
          >
            {loading ? 'Requesting...' : 'Request Float'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
