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
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import {
  getDenominationValues,
  getInitialDenominationRecord,
} from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import {
  Briefcase,
  FileText,
  Info,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type VaultOverviewReconcileModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    newBalance: number;
    denominations: Denomination[];
    reason: string;
    comment: string;
  }) => Promise<void>;
  currentBalance: number;
  systemDenominations: Denomination[];
};

export default function VaultOverviewReconcileModal({
  open,
  onClose,
  onConfirm,
  currentBalance,
  systemDenominations = [],
}: VaultOverviewReconcileModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();
  const [loading, setLoading] = useState(false);

  const denominationsList = useMemo(
    () => getDenominationValues(selectedLicencee),
    [selectedLicencee]
  );

  const [breakdown, setBreakdown] = useState<Record<number, number>>({});
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<string>('Periodic');
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  // Update breakdown when licencee changes or modal opens
  useEffect(() => {
    if (open) {
      setBreakdown(
        getInitialDenominationRecord(selectedLicencee) as Record<number, number>
      );
      setTouchedDenominations(new Set());
      setSource('Periodic');
      setReason('');
    }
  }, [selectedLicencee, open]);

  // ============================================================================
  // Computed
  // ============================================================================
  const totalAmount = useMemo(() => {
    return Object.entries(breakdown).reduce(
      (sum, [denom, count]) => sum + Number(denom) * count,
      0
    );
  }, [breakdown]);

  const variance = totalAmount - currentBalance;

  const isAllTouched = denominationsList.every(d =>
    touchedDenominations.has(Number(d))
  );
  const isValidCount = totalAmount > 0 || isAllTouched;

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleQuantityChange = (denom: number, value: string) => {
    const quantity = parseInt(value) || 0;
    if (quantity < 0) return;
    setBreakdown(prev => ({ ...prev, [denom]: quantity }));
    setTouchedDenominations(prev => {
      const next = new Set(prev);
      next.add(Number(denom));
      return next;
    });
  };

  const getSystemQuantity = (denom: number) => {
    return (
      systemDenominations.find(d => d.denomination === denom)?.quantity || 0
    );
  };

  const VAULT_RECON_SOURCES = [
    { label: 'Periodic', icon: FileText },
    { label: 'Shift', icon: RefreshCw },
    { label: 'Audit', icon: ShieldCheck },
    { label: 'Error', icon: Wrench },
    { label: 'Other', icon: Briefcase },
  ];

  const handleSubmit = async () => {
    // Instead of immediately submitting, show the authenticator modal
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
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
        reason:
          `${source ? `[${source}] ` : ''}${reason.trim()}` ||
          'Periodic reconciliation',
        comment: reason.trim(), // Both fields get the same value
      });
      onClose();
      // Reset form
      setBreakdown(
        getInitialDenominationRecord(selectedLicencee) as Record<number, number>
      );
      setTouchedDenominations(new Set());
      setReason('');
      setSource('Periodic');
    } catch (error) {
      console.error('Reconciliation failed', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Landmark className="h-5 w-5 text-violet-600" />
            Vault Reconciliation
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Compare your physical cash count against system records. Any
            adjustments will be strictly audited.
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6 md:max-h-[75vh]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Left: Denomination Grid */}
            <div className="space-y-4 lg:col-span-3">
              <div className="hidden grid-cols-5 gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400 sm:grid">
                <div className="col-span-1">Bill</div>
                <div className="col-span-2 text-center">System Count</div>
                <div className="col-span-2 text-center">Physical Count</div>
              </div>

              <div className="space-y-3 sm:space-y-2">
                {denominationsList.map(denom => {
                  const systemQty = getSystemQuantity(denom);
                  const physicalQty = breakdown[denom];
                  const isDifferent = systemQty !== physicalQty;

                  return (
                    <div
                      key={denom}
                      className={cn(
                        'flex flex-col gap-3 rounded-xl border p-3 transition-all duration-200 sm:grid sm:grid-cols-5 sm:items-center sm:gap-2',
                        isDifferent
                          ? 'border-amber-200 bg-amber-50/30 ring-1 ring-amber-100'
                          : 'border-gray-100 bg-gray-50/10'
                      )}
                    >
                      {/* Mobile Header */}
                      <div className="flex items-center justify-between sm:block">
                        <div className="text-sm font-black uppercase tracking-tight text-gray-900 sm:text-gray-700">
                          ${denom} Bill
                        </div>
                        <div className="flex items-center gap-2 sm:hidden">
                          <span className="text-[10px] font-black uppercase text-gray-400">
                            System:
                          </span>
                          <span className="text-sm font-bold text-gray-600">
                            {systemQty}
                          </span>
                        </div>
                      </div>

                      {/* System Count (Desktop) */}
                      <div className="col-span-2 hidden justify-center sm:flex">
                        <div className="w-full rounded-lg border border-gray-100 bg-white px-3 py-2 text-center text-sm font-bold text-gray-500 shadow-sm">
                          {systemQty}
                        </div>
                      </div>

                      {/* Physical Input */}
                      <div className="flex flex-col items-center gap-2 sm:col-span-2 sm:flex-row">
                        <span className="self-start text-[10px] font-black uppercase text-gray-400 sm:hidden">
                          Physical Count:
                        </span>
                        <Input
                          type="number"
                          min="0"
                          value={breakdown[denom] || ''}
                          onChange={e =>
                            handleQuantityChange(denom, e.target.value)
                          }
                          className={cn(
                            'h-11 rounded-lg border-2 bg-white text-center font-black transition-all sm:h-9',
                            isDifferent
                              ? 'border-amber-400 focus-visible:ring-amber-400/30'
                              : 'border-gray-100 focus-visible:ring-violet-500/30',
                            touchedDenominations.has(Number(denom)) &&
                              'text-violet-600'
                          )}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-xl shadow-violet-500/20">
                <div className="relative z-10">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-violet-100/60">
                    Total Physical Count
                  </p>
                  <p className="text-3xl font-black tracking-tight">
                    {formatAmount(totalAmount)}
                  </p>
                </div>
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm">
                  <Landmark className="h-6 w-6 text-violet-100" />
                </div>
                <Landmark className="absolute -bottom-4 -right-4 h-24 w-24 rotate-12 text-white/5" />
              </div>
            </div>

            {/* Right: Summary & Audit */}
            <div className="space-y-6 lg:col-span-2">
              <div className="space-y-4 rounded-2xl border border-violet-100 bg-violet-50/30 p-5">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400">
                  <span>System Ledger:</span>
                  <span className="text-gray-900">
                    {formatAmount(currentBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-violet-100 pt-4">
                  <span className="text-[11px] font-black uppercase tracking-widest text-violet-400">
                    Variance:
                  </span>
                  <span
                    className={cn(
                      'text-xl font-black tracking-tight',
                      variance === 0
                        ? 'text-emerald-600'
                        : variance > 0
                          ? 'text-violet-600'
                          : 'text-red-600'
                    )}
                  >
                    {variance > 0 ? '+' : ''}
                    {formatAmount(variance)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400">
                    Reconciliation Source
                  </Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {VAULT_RECON_SOURCES.map(cat => {
                      const isSelected = source === cat.label;
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setSource(cat.label)}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-2 transition-all',
                            isSelected
                              ? 'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200'
                              : 'border-gray-100 bg-white text-gray-600 hover:border-violet-200 hover:bg-violet-50/30'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4',
                              isSelected ? 'text-white' : 'text-violet-500'
                            )}
                          />
                          <span className="text-[9px] font-black uppercase leading-tight tracking-tight">
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="reason"
                    className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400"
                  >
                    Adjustment Notes (Optional)
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Detailed explanation for this audit event..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={4}
                    className="resize-none rounded-2xl border-2 border-gray-100 bg-gray-50/50 text-sm transition-all focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-amber-100/50 bg-amber-50 p-4 text-[11px] text-amber-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="font-medium leading-relaxed">
                  Reconciliation updates the system "Source of Truth" to match
                  your physical cash count. This is a non-reversible adjustment.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 border-t bg-gray-50 p-4 sm:flex-row">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="order-2 font-bold text-gray-500 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValidCount}
            className="order-1 h-12 flex-1 rounded-xl bg-violet-600 text-base font-black text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98] sm:order-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Reconciling...
              </div>
            ) : (
              'Confirm Reconciliation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Vault Reconciliation"
      />
    </Dialog>
  );
}
