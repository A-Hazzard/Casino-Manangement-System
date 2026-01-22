/**
 * Vault Add Cash Modal Component
 *
 * Modal for adding cash to the vault with denomination breakdown.
 *
 * Features:
 * - Source selection dropdown
 * - Denomination breakdown (6 inputs: $100, $50, $20, $10, $5, $1)
 * - Auto-calculated total amount
 * - Optional notes field
 * - Form validation
 * - Loading state on submit
 *
 * @module components/VAULT/modals/VaultAddCashModal
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Textarea } from '@/components/shared/ui/textarea';
import type { CashSource, DenominationBreakdown } from '@/shared/types/vault';

type VaultAddCashModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    source: CashSource;
    breakdown: DenominationBreakdown;
    totalAmount: number;
    notes?: string;
  }) => Promise<void>;
};

// ============================================================================
// Constants
// ============================================================================
/**
 * Available cash denominations for breakdown input
 * Used to calculate total amount from individual denomination counts
 */
const DENOMINATIONS = [
  { key: 'hundred' as const, label: '$100', value: 100 },
  { key: 'fifty' as const, label: '$50', value: 50 },
  { key: 'twenty' as const, label: '$20', value: 20 },
  { key: 'ten' as const, label: '$10', value: 10 },
  { key: 'five' as const, label: '$5', value: 5 },
  { key: 'one' as const, label: '$1', value: 1 },
] as const;

/**
 * Available cash sources for adding cash to vault
 */
const CASH_SOURCES: CashSource[] = [
  'Bank Withdrawal',
  'Owner Injection',
  'Machine Drop',
];

export default function VaultAddCashModal({
  open,
  onClose,
  onConfirm,
}: VaultAddCashModalProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [source, setSource] = useState<CashSource | ''>('');
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
  /**
   * Calculate total amount from denomination breakdown
   * Multiplies each denomination count by its value and sums them
   */
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

  /**
   * Check if form is valid for submission
   * Requires source selection and total amount > 0
   */
  const isValid = source !== '' && totalAmount > 0;

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle denomination input change
   * Updates breakdown state and clears field-specific errors
   *
   * @param key - Denomination key (hundred, fifty, twenty, etc.)
   * @param value - Input value as string
   */
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
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  /**
   * Handle form submission
   * Validates form data, calls onConfirm callback, and resets form on success
   */
  const handleSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!source) {
      newErrors.source = 'Please select a source';
    }
    if (totalAmount <= 0) {
      newErrors.total = 'Total amount must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        source: source as CashSource,
        breakdown,
        totalAmount,
        notes: notes.trim() || undefined,
      });
      // Reset form on success
      setSource('');
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
      console.error('Error adding cash:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   * Resets form state and calls onClose callback
   * Prevents closing while submission is in progress
   */
  const handleClose = () => {
    if (loading) return;
    setSource('');
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
          <DialogTitle>Add Cash To Vault</DialogTitle>
          <DialogDescription>
            Enter the source and denomination breakdown for the cash being added
            to the vault.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Selection */}
          <div className="space-y-2">
            <Label htmlFor="source">Source:</Label>
            <Select
              value={source}
              onValueChange={value => {
                setSource(value as CashSource);
                if (errors.source) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.source;
                    return newErrors;
                  });
                }
              }}
            >
              <SelectTrigger id="source" className="w-full">
                <SelectValue placeholder="Select Source:" />
              </SelectTrigger>
              <SelectContent>
                {CASH_SOURCES.map(src => (
                  <SelectItem key={src} value={src}>
                    {src}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source && (
              <p className="text-sm text-red-600">{errors.source}</p>
            )}
          </div>

          {/* Denomination Breakdown */}
          <div className="space-y-4">
            <Label>Denomination Breakdown:</Label>
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
                    value={breakdown[denom.key] || 0}
                    onChange={e =>
                      handleDenominationChange(denom.key, e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Total Amount */}
          <div className="space-y-2">
            <Label>Total Amount:</Label>
            <Input
              value={`$${totalAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              readOnly
              className="w-full font-semibold"
            />
            {errors.total && (
              <p className="text-sm text-red-600">{errors.total}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional):</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
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
            className="bg-buttonActive text-white hover:bg-buttonActive/90"
          >
            {loading ? 'Adding...' : 'Add Cash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
