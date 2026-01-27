/**
 * Float Request Modal Component
 *
 * Modal for cashiers to request float increases or decreases during their shift.
 * Includes denomination breakdown and reason for request.
 *
 * @module components/VAULT/cashier/shifts/FloatRequestModal
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { TrendingUp, Minus } from 'lucide-react';

type FloatRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: FloatRequestData) => Promise<void>;
  type: 'increase' | 'decrease';
  loading?: boolean;
};

export type FloatRequestData = {
  type: 'increase' | 'decrease';
  amount: number;
  reason: string;
  denominations?: Array<{
    denomination: number;
    count: number;
  }>;
};

export default function FloatRequestModal({
  open,
  onClose,
  onSubmit,
  type,
  loading = false,
}: FloatRequestModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [denominations, setDenominations] = useState<
    Array<{ denomination: number; count: number }>
  >([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a reason for the float request');
      return;
    }

    try {
      await onSubmit({
        type,
        amount: numAmount,
        reason: reason.trim(),
        denominations: denominations.length > 0 ? denominations : undefined,
      });
      // Reset form
      setAmount('');
      setReason('');
      setDenominations([]);
      onClose();
    } catch {
      // Error handled by parent
    }
  };

  const addDenomination = () => {
    setDenominations([...denominations, { denomination: 0, count: 0 }]);
  };

  const updateDenomination = (
    index: number,
    field: 'denomination' | 'count',
    value: number
  ) => {
    const updated = [...denominations];
    updated[index][field] = value;
    setDenominations(updated);
  };

  const removeDenomination = (index: number) => {
    setDenominations(denominations.filter((_, i) => i !== index));
  };

  const Icon = type === 'increase' ? TrendingUp : Minus;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {type === 'increase'
              ? 'Request Float Increase'
              : 'Request Float Decrease'}
          </DialogTitle>
          <DialogDescription>
            {type === 'increase'
              ? 'Request additional float to handle increased customer activity.'
              : 'Request to return excess float to the vault.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="amount"
                className="text-sm font-medium text-gray-700"
              >
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="reason"
                className="text-sm font-medium text-gray-700"
              >
                Reason *
              </Label>
              <Input
                id="reason"
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Brief reason"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                Denomination Breakdown (Optional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDenomination}
              >
                Add Denomination
              </Button>
            </div>

            {denominations.length > 0 && (
              <div className="space-y-2">
                {denominations.map((denom, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Denom"
                      value={denom.denomination || ''}
                      onChange={e =>
                        updateDenomination(
                          index,
                          'denomination',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">×</span>
                    <Input
                      type="number"
                      placeholder="Count"
                      value={denom.count || ''}
                      onChange={e =>
                        updateDenomination(
                          index,
                          'count',
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDenomination(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label
              htmlFor="detailedReason"
              className="text-sm font-medium text-gray-700"
            >
              Detailed Reason (Optional)
            </Label>
            <Textarea
              id="detailedReason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide more details about why you need this float adjustment..."
              className="mt-1"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !amount || !reason.trim()}
              className={
                type === 'increase'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
