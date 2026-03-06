/**
 * Vault Overview Add Cash Modal Component
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
 * @module components/VAULT/overview/modals/VaultOverviewAddCashModal
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import MultiSelectDropdown from '@/components/shared/ui/common/MultiSelectDropdown';
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
import { useVaultLicensee } from '@/lib/hooks/vault/useVaultLicensee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { GamingMachine } from '@/shared/types/entities';
import type { CashSource, Denomination } from '@/shared/types/vault';
import axios from 'axios';
import { ArrowUpRight, Info, Landmark, Loader2, MessageSquare, Plus, RefreshCw, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type VaultOverviewAddCashModalProps = {
  open: boolean;
  onClose: () => void;
  vaultDenominations?: Denomination[];
  onConfirm: (data: {
    source: CashSource;
    denominations: Denomination[];
    totalAmount: number;
    machineIds?: string[];
    bankDetails?: {
      nameOnAccount?: string;
      branch?: string;
    };
    notes?: string;
  }) => Promise<void>;
};

/**
 * Available cash sources for adding cash to vault
 */
const VAULT_ADD_CASH_SOURCES: CashSource[] = [
  'Bank',
  'Owner Deposit',
  'Machine',
];

export default function VaultOverviewAddCashModal({
  open,
  onClose,
  onConfirm,
}: VaultOverviewAddCashModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenseeId: selectedLicensee } = useVaultLicensee();
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [source, setSource] = useState<CashSource | ''>('');
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(new Set());
  const [bankDetails, setBankDetails] = useState({
    nameOnAccount: '',
    branch: '',
  });
  const [machines, setMachines] = useState<{id: string, label: string}[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

  const denomsList = useMemo(() => getDenominationValues(selectedLicensee), [selectedLicensee]);

  useEffect(() => {
    if (open) {
      setDenominations(denomsList.map(d => ({ denomination: Number(d) as Denomination['denomination'], quantity: 0 })));
      setTouchedDenominations(new Set());
    }
  }, [open, denomsList]);

  useEffect(() => {
    if (open && source === 'Machine') {
      const fetchMachines = async () => {
        setLoadingMachines(true);
        try {
          const response = await axios.get('/api/reports/machines', {
            params: {
              type: 'overview',
              limit: 1000,
              licensee: selectedLicensee !== 'all' ? selectedLicensee : undefined,
            },
          });
          const fetchedMachines = response.data.data || [];
          setMachines(
            fetchedMachines.map((m: GamingMachine) => ({
              id: m.machineId || m._id || m.serialNumber,
              label: m.game ? `${m.serialNumber} (${m.game})` : m.serialNumber,
            }))
          );
        } catch (error) {
          console.error('Failed to fetch machines:', error);
        } finally {
          setLoadingMachines(false);
        }
      };
      
      fetchMachines();
    }
  }, [open, source, selectedLicensee]);

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAuthenticator, setShowAuthenticator] = useState(false);

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
   * Requires source selection and total amount > 0
   */
  const isAllTouched = useMemo(() => denomsList.every(d => touchedDenominations.has(Number(d))), [denomsList, touchedDenominations]);
  const isValid = source !== '' && (totalAmount > 0 || isAllTouched);

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
    setTouchedDenominations(prev => {
      const next = new Set(prev);
      next.add(denomination);
      return next;
    });
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
    if (source === 'Machine' && selectedMachineIds.length === 0) {
      newErrors.machines = 'Please select at least one machine';
    }
    if (source === 'Bank') {
      if (!bankDetails.nameOnAccount.trim()) newErrors.nameOnAccount = 'Required';
    }
    if (totalAmount <= 0) {
      newErrors.total = 'Total amount must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Trigger TOTP verification
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    setLoading(true);
    try {
      await onConfirm({
        source: source as CashSource,
        denominations: denominations,
        totalAmount,
        machineIds: source === 'Machine' ? selectedMachineIds : undefined,
        bankDetails: source === 'Bank' ? bankDetails : undefined,
        notes: notes.trim() || undefined,
      });
      // Reset form on success
      setSource('');
      setDenominations(denomsList.map(d => ({ denomination: d as Denomination['denomination'], quantity: 0 })));
      setTouchedDenominations(new Set());
      setSelectedMachineIds([]);
      setBankDetails({ nameOnAccount: '', branch: '' });
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
    setDenominations(denomsList.map(d => ({ denomination: d as Denomination['denomination'], quantity: 0 })));
    setTouchedDenominations(new Set());
    setSelectedMachineIds([]);
    setBankDetails({ nameOnAccount: '', branch: '' });
    setNotes('');
    setErrors({});
    onClose();
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="md:max-w-2xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <ArrowUpRight className="h-5 w-5 text-violet-600" />
            Add Cash to Vault
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Replenish vault inventory by recording new cash arrivals.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 md:max-h-[75vh] custom-scrollbar">
          {/* Source Selection - Premium Layout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label htmlFor="source" className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Funding Source
              </Label>
              {errors.source && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VAULT_ADD_CASH_SOURCES.map(src => {
                const isSelected = source === src;
                const Icon = src === 'Bank' ? Landmark : src === 'Owner Deposit' ? Wallet : Plus;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSource(src)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                      isSelected 
                        ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200" 
                        : "bg-white border-gray-100 text-gray-600 hover:border-violet-200 hover:bg-violet-50/30"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isSelected ? "text-white" : "text-violet-500")} />
                    <span className="text-[11px] font-black uppercase tracking-tight leading-tight">{src}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Machine Selection */}
          {source === 'Machine' && (
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
               <div className="flex items-center justify-between px-1">
                 <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Machine Source(s)</Label>
                 {errors.machines && <span className="text-[10px] font-bold text-red-500 uppercase">Required</span>}
               </div>
               {loadingMachines ? (
                 <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 font-medium">
                   <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                   Machine selection loading...
                 </div>
               ) : (
                 <MultiSelectDropdown
                   options={machines}
                   selectedIds={selectedMachineIds}
                   onChange={setSelectedMachineIds}
                   placeholder="Select machines that cash was collected from..."
                   label="machines"
                 />
               )}
            </div>
          )}

          {/* Bank Selection */}
          {source === 'Bank' && (
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
               <div className="flex items-center justify-between px-1">
                 <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Bank Details</Label>
               </div>
               <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Name on Account <span className="text-red-500">*</span></Label>
                    <input
                      type="text" placeholder="John Doe"
                      value={bankDetails.nameOnAccount} onChange={e => setBankDetails({...bankDetails, nameOnAccount: e.target.value})}
                      className={cn("w-full px-3 py-2 rounded-xl border text-sm focus:border-violet-500 outline-none", errors.nameOnAccount ? "border-red-500" : "border-gray-200")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-600">Branch (Optional)</Label>
                    <input
                      type="text" placeholder="Branch Name/Code"
                      value={bankDetails.branch} onChange={e => setBankDetails({...bankDetails, branch: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-violet-500 outline-none"
                    />
                  </div>
               </div>
            </div>
          )}

          {/* Denomination Grid - Row Style */}
          <div className="space-y-4">
            <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
              Denomination Breakdown
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {denominations.map(denom => (
                <div 
                  key={denom.denomination} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                    denom.quantity > 0 
                      ? "bg-violet-50/50 border-violet-200 ring-1 ring-violet-100" 
                      : "bg-gray-50/30 border-gray-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                        denom.quantity > 0 ? "text-violet-600 border border-violet-100" : "text-gray-400 border border-transparent"
                    )}>
                        ${denom.denomination}
                    </div>
                    <span className="text-xs font-bold text-gray-700">Bills</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={denom.quantity === 0 ? '' : denom.quantity}
                    onChange={e => handleDenominationChange(denom.denomination, e.target.value)}
                    placeholder="0"
                    className={cn(
                        "w-16 h-9 text-center font-black bg-white rounded-lg border-gray-200 focus-visible:ring-violet-500/30 transition-all",
                        touchedDenominations.has(denom.denomination) && "text-violet-600"
                    )}
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
                   Internal Notes (Optional)
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

             <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 shadow-sm text-violet-900">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Total Value</span>
                   <ArrowUpRight className="h-4 w-4 text-violet-500" />
                </div>
                <div className="space-y-0.5">
                   <span className="text-3xl font-black tracking-tight text-violet-700">{formatAmount(totalAmount)}</span>
                   <p className="text-[10px] text-violet-600/60 font-bold uppercase tracking-tight">Verified Inbound Cash</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-violet-400 border-t border-violet-200/50 pt-4">
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
            className="order-1 sm:order-2 flex-1 h-12 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Adding Cash...
              </div>
            ) : 'Confirm Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <VaultAuthenticatorModal
      open={showAuthenticator}
      onClose={() => setShowAuthenticator(false)}
      onVerified={handleAuthVerified}
      actionName="Add Cash to Vault"
    />
  </>
  );
}
