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
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { CashSource, DenominationBreakdown } from '@/shared/types/vault';
import { ArrowUpRight, Info, Landmark, MessageSquare, Plus, RefreshCw, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

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
  const { formatAmount } = useCurrencyFormat();
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
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-blue-50 border-b border-blue-100">
          <DialogTitle className="flex items-center gap-2 text-blue-900">
            <ArrowUpRight className="h-5 w-5 text-blue-600" />
            Add Cash to Vault
          </DialogTitle>
          <DialogDescription className="text-blue-700/80">
            Replenish vault inventory by recording new cash arrivals.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Source Selection - Premium Layout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label htmlFor="source" className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Funding Source
              </Label>
              {errors.source && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CASH_SOURCES.map(src => {
                const isSelected = source === src;
                const Icon = src === 'Bank Withdrawal' ? Landmark : src === 'Owner Injection' ? Wallet : Plus;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSource(src)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                      isSelected 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-white border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-blue-50/30"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isSelected ? "text-white" : "text-blue-500")} />
                    <span className="text-[11px] font-black uppercase tracking-tight leading-tight">{src}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Denomination Grid - Row Style */}
          <div className="space-y-4">
            <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
              Denomination Breakdown
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DENOMINATIONS.map(denom => (
                <div 
                  key={denom.key} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                    breakdown[denom.key] > 0 
                      ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100" 
                      : "bg-gray-50/30 border-gray-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                        breakdown[denom.key] > 0 ? "text-blue-600 border border-blue-100" : "text-gray-400 border border-transparent"
                    )}>
                        {denom.label}
                    </div>
                    <span className="text-xs font-bold text-gray-700">Bills</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={breakdown[denom.key] || ''}
                    onChange={e => handleDenominationChange(denom.key, e.target.value)}
                    placeholder="0"
                    className="w-16 h-9 text-center font-black bg-white rounded-lg border-gray-200 focus-visible:ring-blue-500/30 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
             <div className="space-y-2">
                <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1">
                   <MessageSquare className="h-3 w-3" />
                   Internal Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Optional details about this arrival..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none bg-gray-50/50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm"
                />
             </div>

             <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl p-5 shadow-xl shadow-blue-900/10">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 opacity-60">Total Value</span>
                   <ArrowUpRight className="h-4 w-4 text-blue-400" />
                </div>
                <div className="space-y-0.5">
                   <span className="text-3xl font-black text-white tracking-tight">{formatAmount(totalAmount)}</span>
                   <p className="text-[10px] text-blue-200/50 font-bold uppercase tracking-tight">Verified Inbound Cash</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-white/40 border-t border-white/5 pt-4">
                   <Info className="h-3 w-3" />
                   Affects vault inventory immediately
                </div>
             </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={loading} className="order-2 sm:order-1 font-bold text-gray-500">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="order-1 sm:order-2 flex-1 h-12 bg-blue-600 text-white hover:bg-blue-700 font-black text-base shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all rounded-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Adding Cash...
              </div>
            ) : 'Confirm Arrival'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
