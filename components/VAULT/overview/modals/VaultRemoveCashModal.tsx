/**
 * Vault Remove Cash Modal Component
 *
 * Modal for removing cash from the vault with denomination breakdown.
 *
 * Features:
 * - Destination selection dropdown
 * - Denomination breakdown (6 inputs: $100, $50, $20, $10, $5, $1)
 * - Auto-calculated total amount
 * - Optional notes field
 * - Form validation
 * - Loading state on submit
 *
 * @module components/VAULT/modals/VaultRemoveCashModal
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
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type {
    CashDestination,
    Denomination
} from '@/shared/types/vault';
import { ArrowDownRight, CreditCard, Info, Landmark, MessageSquare, Monitor, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type VaultRemoveCashModalProps = {
  open: boolean;
  onClose: () => void;
  vaultDenominations?: Denomination[];
  onConfirm: (data: {
    destination: CashDestination;
    denominations: Denomination[];
    totalAmount: number;
    notes?: string;
  }) => Promise<void>;
};

/**
 * Available cash destinations for removing cash from vault
 */
const CASH_DESTINATIONS: CashDestination[] = [
  'Bank Deposit',
  'Owner Drawing',
  'ATM Fill',
];

export default function VaultRemoveCashModal({
  open,
  onClose,
  vaultDenominations = [],
  onConfirm,
}: VaultRemoveCashModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [destination, setDestination] = useState<CashDestination | ''>('');
  const [denominations, setDenominations] = useState<Denomination[]>([]);

  const denomsList = useMemo(() => getDenominationValues(selectedLicencee), [selectedLicencee]);

  useEffect(() => {
    if (open) {
      setDenominations(denomsList.map(d => ({ denomination: d as any, quantity: 0 })));
    }
  }, [open, denomsList]);
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
    return denominations.reduce((acc, curr) => acc + (curr.denomination * curr.quantity), 0);
  }, [denominations]);

  /**
   * Check if form is valid for submission
   * Requires destination selection and total amount > 0
   */
  const isValid = destination !== '' && totalAmount > 0;

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
    denomination: number,
    value: string
  ) => {
    const numValue = parseInt(value, 10) || 0;
    if (numValue < 0) return;

    setDenominations(prev => prev.map(d => d.denomination === denomination ? { ...d, quantity: numValue } : d));
  };

  /**
   * Handle form submission
   * Validates form data, calls onConfirm callback, and resets form on success
   */
  const handleSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!destination) {
      newErrors.destination = 'Please select a destination';
    }
    if (totalAmount <= 0) {
      newErrors.total = 'Total amount must be greater than 0';
    }

    // Real-time stock check
    const overages = denominations.some(requested => {
      if (requested.quantity <= 0) return false;
      const available = vaultDenominations.find(d => d.denomination === requested.denomination)?.quantity || 0;
      return requested.quantity > available;
    });

    if (overages) {
      toast.error('Insufficient Stock', {
        description: 'One or more denominations exceed the available vault inventory.'
      });
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        destination: destination as CashDestination,
        denominations,
        totalAmount,
        notes: notes.trim() || undefined,
      });
      // Reset form on success
      setDestination('');
      setDenominations(denomsList.map(d => ({ denomination: d as any, quantity: 0 })));
      setNotes('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error removing cash:', error);
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
    setDestination('');
    setDenominations(denomsList.map(d => ({ denomination: d as any, quantity: 0 })));
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
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <ArrowDownRight className="h-5 w-5 text-violet-600" />
            Remove Cash from Vault
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Record cash leaving the vault for deposits or replenishment.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Destination Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label htmlFor="destination" className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Outbound Destination
              </Label>
              {errors.destination && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CASH_DESTINATIONS.map(dest => {
                const isSelected = destination === dest;
                const Icon = dest === 'Bank Deposit' ? Landmark : dest === 'ATM Fill' ? Monitor : CreditCard;
                return (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => setDestination(dest)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                      isSelected 
                        ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200" 
                        : "bg-white border-gray-100 text-gray-600 hover:border-violet-200 hover:bg-violet-50/30"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isSelected ? "text-white" : "text-violet-500")} />
                    <span className="text-[11px] font-black uppercase tracking-tight leading-tight">{dest}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Denomination Grid */}
          <div className="space-y-4">
            <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
              Denomination Breakdown & Stock
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {denominations.map(denom => {
                const available = vaultDenominations.find(d => d.denomination === denom.denomination)?.quantity || 0;
                const requested = denom.quantity;
                const isOver = requested > available;

                return (
                  <div 
                    key={denom.denomination} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                      requested > 0 
                        ? (isOver ? "bg-red-50 border-red-200 ring-1 ring-red-100" : "bg-violet-50/50 border-violet-200 ring-1 ring-violet-100") 
                        : "bg-gray-50/30 border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                          requested > 0 ? (isOver ? "text-red-600 border border-red-100" : "text-violet-600 border border-violet-100") : "text-gray-400 border border-transparent"
                      )}>
                          ${denom.denomination}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Vault Stock</span>
                        <span className={cn("text-xs font-bold", available > 0 ? "text-gray-900" : "text-gray-300")}>{available}</span>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={requested === 0 ? '' : requested}
                      onChange={e => handleDenominationChange(denom.denomination, e.target.value)}
                      placeholder="0"
                      className={cn(
                        "w-16 h-9 text-center font-black bg-white rounded-lg border-gray-200 focus-visible:ring-violet-500/30 transition-all",
                        isOver && "border-red-500 text-red-600"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
             <div className="space-y-2">
                <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1">
                   <MessageSquare className="h-3 w-3" />
                   Removal Reason
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Optional details about this removal..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none bg-gray-50/50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm"
                />
             </div>

             <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 shadow-sm text-violet-900">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Total Value</span>
                   <ArrowDownRight className="h-4 w-4 text-violet-500" />
                </div>
                <div className="space-y-0.5">
                   <span className="text-3xl font-black tracking-tight text-violet-700">{formatAmount(totalAmount)}</span>
                   <p className="text-[10px] text-violet-600/60 font-bold uppercase tracking-tight">Outbound Cash Value</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-violet-400 border-t border-violet-200/50 pt-4">
                   <Info className="h-3 w-3" />
                   Stock deducted immediately
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
            className="order-1 sm:order-2 flex-1 h-12 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : 'Confirm Removal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
