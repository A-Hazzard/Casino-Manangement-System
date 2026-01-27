/**
 * @module components/VAULT/cashier/shifts/BlindCloseModal
 *
 * @description
 * This component implements the critical security feature C-4: Blind Shift Closing.
 * The modal allows a cashier to enter their final cash count by denomination
 * without seeing the system's expected total. If the entered amount does not match
 * the expected balance, the shift is flagged for manager review.
 *
 * @feature C-4
 */

'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';
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
import type { DenominationBreakdown } from '@/shared/types/vault';
import { toast } from 'sonner';

// ============================================================================
// Constants & Types
// ============================================================================

const DENOMINATIONS = [
  { key: 'hundred' as const, label: '$100', value: 100 },
  { key: 'fifty' as const, label: '$50', value: 50 },
  { key: 'twenty' as const, label: '$20', value: 20 },
  { key: 'ten' as const, label: '$10', value: 10 },
  { key: 'five' as const, label: '$5', value: 5 },
  { key: 'one' as const, label: '$1', value: 1 },
] as const;

type BlindCloseModalProps = {
  open: boolean;
  shiftId: string | null;
  onClose: () => void;
  onSuccess: (status: 'closed' | 'pending_review') => void;
};

// ============================================================================
// Component
// ============================================================================

export default function BlindCloseModal({
  open,
  shiftId,
  onClose,
  onSuccess,
}: BlindCloseModalProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================

  const [breakdown, setBreakdown] = useState<DenominationBreakdown>({
    hundred: 0,
    fifty: 0,
    twenty: 0,
    ten: 0,
    five: 0,
    one: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const totalAmount = useMemo(() => {
    return DENOMINATIONS.reduce(
      (acc, denom) => acc + (breakdown[denom.key] || 0) * denom.value,
      0
    );
  }, [breakdown]);

  const isValid = totalAmount > 0;

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDenominationChange = (
    key: keyof DenominationBreakdown,
    value: string
  ) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      setBreakdown((prev: DenominationBreakdown) => ({
        ...prev,
        [key]: 0,
      }));
      return;
    }
    setBreakdown((prev: DenominationBreakdown) => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const resetForm = () => {
    setBreakdown({
      hundred: 0,
      fifty: 0,
      twenty: 0,
      ten: 0,
      five: 0,
      one: 0,
    });
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!shiftId) {
      setError('Shift ID is missing. Cannot close shift.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/cashier/shift/close', {
        shiftId: shiftId,
        physicalCount: totalAmount,
        denominations: {
          hundreds: breakdown.hundred,
          fifties: breakdown.fifty,
          twenties: breakdown.twenty,
          tens: breakdown.ten,
          fives: breakdown.five,
          ones: breakdown.one,
        },
      });

      const { status, message } = response.data;
      toast.success(message || 'Shift closed successfully.');
      onSuccess(status);
      handleClose();
    } catch (err: unknown) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>End Shift - Blind Close</DialogTitle>
          <DialogDescription>
            Enter the final count of all cash in your drawer. The system will
            verify the total. Your expected balance is not shown to ensure a
            blind count.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label>Final Denomination Count:</Label>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {DENOMINATIONS.map(denom => (
                <div key={denom.key} className="space-y-2">
                  <Label htmlFor={denom.key} className="text-sm">
                    {denom.label}
                  </Label>
                  <Input
                    id={denom.key}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={
                      breakdown[denom.key] === 0 ? '' : breakdown[denom.key]
                    }
                    onChange={e =>
                      handleDenominationChange(denom.key, e.target.value)
                    }
                    className="w-full"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <Label>Total Entered Amount:</Label>
            <Input
              value={`$${totalAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              readOnly
              className="w-full text-lg font-bold"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="bg-buttonActive text-white hover:bg-buttonActive/90"
          >
            {loading ? 'Submitting...' : 'End My Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
