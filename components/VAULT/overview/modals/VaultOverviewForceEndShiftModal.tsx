/**
 * Vault Overview Force End Shift Modal Component
 *
 * Collect the remaining float from a cashier to end their shift.
 * This moves the shift to Pending Review.
 *
 * @module components/VAULT/overview/modals/VaultOverviewForceEndShiftModal
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
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import {
  getDenominationValues,
  getInitialDenominationRecord,
  recordToDenominations,
} from '@/lib/utils/vault/denominations';
import { AlertCircle, Landmark, RefreshCw, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VaultOverviewForceEndShiftModalProps {
  open: boolean;
  onClose: () => void;
  cashier: {
    _id: string; // shiftId
    cashierId?: string; // userId
    username: string;
    cashierName?: string;
  } | null;
  licenceeId?: string;
  locationId?: string;
  onSuccess: () => void;
}

export default function VaultOverviewForceEndShiftModal({
  open,
  onClose,
  cashier,
  licenceeId,
  locationId,
  onSuccess,
}: VaultOverviewForceEndShiftModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: effectiveLicenceeId } = useVaultLicencee();
  const [denominations, setDenominations] = useState<Record<string, number>>(
    {}
  );
  const [touchedDenominations, setTouchedDenominations] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);

  // ============================================================================
  // Computed
  // ============================================================================
  const finalLicenceeId = licenceeId || effectiveLicenceeId;
  const denomValues = getDenominationValues(finalLicenceeId);

  const shiftTotal = Object.entries(denominations).reduce(
    (sum, [val, qty]) => sum + Number(val) * qty,
    0
  );

  const allTouched = denomValues.every(d =>
    touchedDenominations.has(d.toString())
  );
  const isValid = shiftTotal > 0 || allTouched;

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (open) {
      setDenominations(getInitialDenominationRecord(finalLicenceeId));
      setTouchedDenominations(new Set());
    }
  }, [open, finalLicenceeId]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleSubmit = async () => {
    if (!cashier || !locationId) return;

    setLoading(true);
    try {
      const denoms = recordToDenominations(denominations);

      const res = await fetch('/api/vault/cashier-shift/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: cashier._id, // The cashier shift's _id (most reliable)
          cashierId: cashier.cashierId || cashier._id, // Fallback: cashier user ID
          locationId: locationId,
          denominations: denoms,
          physicalCount: shiftTotal,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `Shift ended for ${cashier.cashierName || cashier.username}. Move to Pending Review.`
        );
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to end shift');
      }
    } catch (error) {
      console.error('Error ending shift:', error);
      toast.error('An error occurred while ending shift');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="!z-[200] flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-none p-0 shadow-2xl md:h-auto md:max-w-[550px] md:rounded-2xl"
        backdropClassName="bg-black/60 backdrop-blur-md !z-[190]"
      >
        {/* Premium Header */}
        <DialogHeader className="relative shrink-0 overflow-hidden bg-gradient-to-r from-red-600 to-red-700 p-6 text-left">
          <div className="absolute right-0 top-0 rotate-12 p-8 opacity-10">
            <ShieldAlert className="h-24 w-24 text-white" />
          </div>
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <RefreshCw className="h-4 w-4 animate-pulse text-white" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight text-white">
                Force End Shift
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm font-bold text-red-100/90">
              Ending shift for{' '}
              <span className="text-white underline decoration-white/30 underline-offset-4">
                {cashier?.cashierName || cashier?.username}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto bg-[#fcfcfd] p-6 md:max-h-[65vh]">
          {/* Info Banner */}
          <div className="flex items-start gap-4 rounded-xl border border-red-100 bg-red-50 p-4 shadow-sm">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="mb-1 text-xs font-black uppercase tracking-widest text-red-900">
                Security Warning
              </h4>
              <p className="text-xs font-medium leading-relaxed text-red-700/80">
                This action immediately stops the cashier's active session. Use
                this ONLY if the cashier is physically unable to perform a
                regular blind close.
              </p>
            </div>
          </div>

          {/* Denomination Grid Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Inventory to Collect
              </h3>
              {allTouched && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-green-600">
                  Verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {denomValues.map(denom => (
                <div
                  key={denom}
                  className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-red-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-xs font-black text-gray-500 transition-colors group-hover:bg-red-50 group-hover:text-red-600">
                    ${denom}
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      id={`force-denom-${denom}`}
                      min="0"
                      className={cn(
                        'w-full border-none bg-transparent p-0 text-xl font-black text-gray-900 placeholder:text-gray-200 focus:ring-0',
                        touchedDenominations.has(denom.toString()) &&
                          'text-red-600'
                      )}
                      value={denominations[denom.toString()] || ''}
                      onChange={e => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setDenominations(prev => ({
                          ...prev,
                          [denom.toString()]: val,
                        }));
                        setTouchedDenominations(prev => {
                          const next = new Set(prev);
                          next.add(denom.toString());
                          return next;
                        });
                      }}
                      placeholder="0"
                    />
                    <p className="text-[9px] font-black uppercase tracking-tighter text-gray-300">
                      Enter Count
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Total Card */}
          <div className="relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-red-100 bg-white p-6 shadow-sm">
            <div className="pointer-events-none absolute -bottom-10 -left-10 rotate-45 select-none opacity-[0.03]">
              <Landmark className="h-40 w-40" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Total physical cash to be received
            </span>
            <span className="text-4xl font-black tracking-tighter text-red-600">
              {formatAmount(shiftTotal)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 flex-row gap-3 border-t bg-gray-50 p-4 md:p-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-12 flex-1 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white"
          >
            Abort
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="h-12 flex-[2] rounded-xl bg-red-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-200 transition-all hover:bg-red-700 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin" /> Processing...
              </span>
            ) : (
              'Proceed & Finalize'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
