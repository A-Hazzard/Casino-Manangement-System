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
import { useVaultLicensee } from '@/lib/hooks/vault/useVaultLicensee';
import { cn } from '@/lib/utils';
import { getDenominationValues, getInitialDenominationRecord, recordToDenominations } from '@/lib/utils/vault/denominations';
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
  licenseeId?: string;
  locationId?: string;
  onSuccess: () => void;
}

export default function VaultOverviewForceEndShiftModal({
  open,
  onClose,
  cashier,
  licenseeId,
  locationId,
  onSuccess,
}: VaultOverviewForceEndShiftModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenseeId: effectiveLicenseeId } = useVaultLicensee();
  const [denominations, setDenominations] = useState<Record<string, number>>({});
  const [touchedDenominations, setTouchedDenominations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const finalLicenseeId = licenseeId || effectiveLicenseeId;
  const denomValues = getDenominationValues(finalLicenseeId);

  useEffect(() => {
    if (open) {
      setDenominations(getInitialDenominationRecord(finalLicenseeId));
      setTouchedDenominations(new Set());
    }
  }, [open, finalLicenseeId]);

  const shiftTotal = Object.entries(denominations).reduce(
    (sum, [val, qty]) => sum + (Number(val) * qty), 
    0
  );

  const handleSubmit = async () => {
    if (!cashier || !locationId) return;
    
    setLoading(true);
    try {
      const denoms = recordToDenominations(denominations);

      const res = await fetch('/api/vault/cashier-shift/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: cashier._id,                          // The cashier shift's _id (most reliable)
          cashierId: cashier.cashierId || cashier._id,   // Fallback: cashier user ID
          locationId: locationId,
          denominations: denoms,
          physicalCount: shiftTotal,
        })
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Shift ended for ${cashier.cashierName || cashier.username}. Move to Pending Review.`);
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

  const allTouched = denomValues.every(d => touchedDenominations.has(d.toString()));
  const isValid = (shiftTotal > 0 || allTouched);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="w-full h-[100dvh] md:h-auto md:max-w-[550px] flex flex-col p-0 overflow-hidden rounded-none md:rounded-2xl border-none shadow-2xl"
        backdropClassName="bg-black/80 backdrop-blur-md"
      >
        {/* Premium Header */}
        <DialogHeader className="p-6 bg-gradient-to-r from-red-600 to-red-700 shrink-0 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
             <ShieldAlert className="h-24 w-24 text-white" />
          </div>
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-white animate-pulse" />
                </div>
                <DialogTitle className="text-xl font-black text-white tracking-tight">
                  Force End Shift
                </DialogTitle>
            </div>
            <DialogDescription className="text-red-100/90 font-bold text-sm">
                Ending shift for <span className="text-white underline decoration-white/30 underline-offset-4">{cashier?.cashierName || cashier?.username}</span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#fcfcfd] custom-scrollbar md:max-h-[65vh]">
           {/* Info Banner */}
           <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
              <div className="h-10 w-10 flex-shrink-0 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                  <h4 className="font-black text-red-900 text-xs uppercase tracking-widest mb-1">Security Warning</h4>
                  <p className="text-xs text-red-700/80 leading-relaxed font-medium">
                      This action immediately stops the cashier's active session. Use this ONLY if the cashier is physically unable to perform a regular blind close.
                  </p>
              </div>
           </div>

           {/* Denomination Grid Section */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Inventory to Collect</h3>
                {allTouched && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-tight">Verified</span>}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {denomValues.map(denom => (
                   <div key={denom} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-all">
                      <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center font-black text-xs text-gray-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                         ${denom}
                      </div>
                      <div className="flex-1">
                         <input
                           type="number"
                           id={`force-denom-${denom}`}
                           min="0"
                           className={cn(
                             "w-full bg-transparent border-none focus:ring-0 text-xl font-black text-gray-900 p-0 placeholder:text-gray-200",
                             touchedDenominations.has(denom.toString()) && "text-red-600"
                           )}
                           value={denominations[denom.toString()] || ''}
                           onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setDenominations(prev => ({ ...prev, [denom.toString()]: val }));
                              setTouchedDenominations(prev => {
                                 const next = new Set(prev);
                                 next.add(denom.toString());
                                 return next;
                              });
                           }}
                           placeholder="0"
                         />
                         <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Enter Count</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Collection Total Card */}
           <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-red-100 flex flex-col items-center justify-center gap-1 shadow-sm relative overflow-hidden">
              <div className="absolute -left-10 -bottom-10 opacity-[0.03] rotate-45 select-none pointer-events-none">
                  <Landmark className="h-40 w-40" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total physical cash to be received</span>
              <span className="text-4xl font-black text-red-600 tracking-tighter">{formatAmount(shiftTotal)}</span>
           </div>


        </div>

        {/* Footer */}
        <DialogFooter className="p-4 md:p-6 bg-gray-50 border-t shrink-0 flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="flex-1 h-12 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-white"
          >
            Abort
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !isValid}
            className="flex-[2] h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 transition-all active:scale-[0.98]"
          >
            {loading ? (
                <span className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Processing...
                </span>
            ) : 'Proceed & Finalize'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
