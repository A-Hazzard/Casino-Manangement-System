/**
 * Vault Reconcile Modal Component
 *
 * Modal for reconciling vault balance.
 * Allows adjusting the system balance to match physical count with mandatory audit comment.
 *
 * @module components/VAULT/modals/VaultReconcileModal
 */
'use client';

import { useState, useMemo } from 'react';
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
import { Textarea } from '@/components/shared/ui/textarea';
import type { Denomination } from '@/shared/types/vault';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

type VaultReconcileModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    newBalance: number;
    denominations: Denomination[];
    reason: string;
    comment: string;
  }) => Promise<void>;
  currentBalance: number;
};

const DENOMINATIONS = [100, 50, 20, 10, 5, 1] as const;

export default function VaultReconcileModal({
  open,
  onClose,
  onConfirm,
  currentBalance,
}: VaultReconcileModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<Record<number, number>>({
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const totalAmount = useMemo(() => {
    return Object.entries(breakdown).reduce(
      (sum, [denom, count]) => sum + Number(denom) * count,
      0
    );
  }, [breakdown]);

  const variance = totalAmount - currentBalance;

  const handleQuantityChange = (denom: number, value: string) => {
    const quantity = parseInt(value) || 0;
    if (quantity < 0) return;
    setBreakdown(prev => ({ ...prev, [denom]: quantity }));
  };

  const handleSubmit = async () => {
    if (comment.length < 10) {
      alert('Audit comment must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const denominations: Denomination[] = Object.entries(breakdown).map(
        ([denom, quantity]) => ({
          denomination: Number(denom) as Denomination['denomination'],
          quantity,
        })
      );

      await onConfirm({
        newBalance: totalAmount,
        denominations,
        reason: reason || 'Periodic reconciliation',
        comment,
      });
      onClose();
      // Reset form
      setBreakdown({ 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
      setReason('');
      setComment('');
    } catch (error) {
      console.error('Reconciliation failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reconcile Vault</DialogTitle>
          <DialogDescription>
            Adjust system balance to match physical count. This action will be
            logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
          {/* Left Column: Denominations */}
          <div className="space-y-4">
            <Label>Physical Count</Label>
            <div className="grid grid-cols-2 gap-3">
              {DENOMINATIONS.map(denom => (
                <div key={denom} className="space-y-1">
                  <Label className="text-xs text-gray-500">${denom}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={breakdown[denom]}
                    onChange={e => handleQuantityChange(denom, e.target.value)}
                    className="text-right"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total Count:</span>
              <span>{formatAmount(totalAmount)}</span>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="space-y-4">
            <div className="rounded-md bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">System Balance:</span>
                <span className="font-medium">
                  {formatAmount(currentBalance)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-600">Variance:</span>
                <span
                  className={`font-bold ${
                    variance === 0
                      ? 'text-green-600'
                      : variance > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                  }`}
                >
                  {variance > 0 ? '+' : ''}
                  {formatAmount(variance)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment</Label>
              <Input
                id="reason"
                placeholder="e.g. Periodic Count, Error Correction"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">
                Audit Comment <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="comment"
                placeholder="Detailed explanation (required)"
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                className={
                  comment.length > 0 && comment.length < 10
                    ? 'border-red-500'
                    : ''
                }
              />
              <p className="text-xs text-gray-500">
                Minimum 10 characters required.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || comment.length < 10}
            className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
          >
            {loading ? 'Reconciling...' : 'Confirm Reconciliation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
