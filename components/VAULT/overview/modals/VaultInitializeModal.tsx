/**
 * Vault Initialize Modal Component
 *
 * Modal for initializing the vault (starting a new shift) with denomination breakdown.
 *
 * Features:
 * - Denomination breakdown (6 inputs: $100, $50, $20, $10, $5, $1)
 * - Auto-calculated total amount
 * - Optional notes field
 * - Form validation
 * - Loading state on submit
 *
 * @module components/VAULT/modals/VaultInitializeModal
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
import { Textarea } from '@/components/shared/ui/textarea';
import type { Denomination, DenominationBreakdown } from '@/shared/types/vault';
import { useMemo, useState } from 'react';

type VaultInitializeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    denominations: Denomination[];
    totalAmount: number;
    notes?: string;
  }) => Promise<void>;
};

// ============================================================================
// Constants
// ============================================================================
/**
 * Available cash denominations for breakdown input
 */
const DENOMINATIONS_CONFIG = [
  { key: 'hundred' as const, label: '$100', value: 100 },
  { key: 'fifty' as const, label: '$50', value: 50 },
  { key: 'twenty' as const, label: '$20', value: 20 },
  { key: 'ten' as const, label: '$10', value: 10 },
  { key: 'five' as const, label: '$5', value: 5 },
  { key: 'one' as const, label: '$1', value: 1 },
] as const;

export default function VaultInitializeModal({
  open,
  onClose,
  onConfirm,
}: VaultInitializeModalProps) {
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
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // Computed Values
  // ============================================================================
  const totalAmount = useMemo(() => {
    return (
      breakdown.hundred * 100 +
      breakdown.fifty * 50 +
      breakdown.twenty * 20 +
      breakdown.ten * 10 +
      breakdown.five * 5 +
      breakdown.one * 1
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
    const numValue = parseInt(value, 10) || 0;
    if (numValue < 0) return;

    setBreakdown(prev => ({
      ...prev,
      [key]: numValue,
    }));
    
    if (errors.total) {
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (totalAmount <= 0) {
      setErrors({ total: 'Total amount must be greater than 0' });
      return;
    }

    setLoading(true);
    try {
      // Map breakdown to Denomination[] format required by API
      const denominations: Denomination[] = [
        { denomination: 100, quantity: breakdown.hundred },
        { denomination: 50, quantity: breakdown.fifty },
        { denomination: 20, quantity: breakdown.twenty },
        { denomination: 10, quantity: breakdown.ten },
        { denomination: 5, quantity: breakdown.five },
        { denomination: 1, quantity: breakdown.one },
      ].filter(d => d.quantity > 0) as Denomination[];

      await onConfirm({
        denominations,
        totalAmount,
        notes: notes.trim() || undefined,
      });
      
      // Reset form on success
      setBreakdown({
        hundred: 0,
        fifty: 0,
        twenty: 0,
        ten: 0,
        five: 0,
        one: 0,
      });
      setNotes('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error initializing vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setBreakdown({
      hundred: 0,
      fifty: 0,
      twenty: 0,
      ten: 0,
      five: 0,
      one: 0,
    });
    setNotes('');
    setErrors({});
    onClose();
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Open New Vault Shift</DialogTitle>
          <DialogDescription>
            Initialize the vault for today by entering the current physical cash on hand breakdown.
            This establishes the starting balance for your shift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Denomination Breakdown */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Denomination Breakdown:</Label>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {DENOMINATIONS_CONFIG.map(denom => (
                <div key={denom.key} className="space-y-2">
                  <Label htmlFor={denom.key} className="text-sm">
                    {denom.label} Bills
                  </Label>
                  <Input
                    id={denom.key}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={breakdown[denom.key] || ''}
                    onChange={e =>
                      handleDenominationChange(denom.key, e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Total Amount Display */}
          <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Calculated Opening Balance:</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-button/10 flex items-center justify-center text-button">
                <span className="font-bold">$</span>
              </div>
            </div>
            {errors.total && (
              <p className="mt-2 text-sm text-red-600 font-medium">{errors.total}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="init-notes">Audit Comment / Notes (Optional):</Label>
            <Textarea
              id="init-notes"
              placeholder="E.g., Starting balance for morning shift..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="bg-button text-white hover:bg-button/90 flex-1 sm:flex-none"
          >
            {loading ? 'Initializing...' : 'Start Vault Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
