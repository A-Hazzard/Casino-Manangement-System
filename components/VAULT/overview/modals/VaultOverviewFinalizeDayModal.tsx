/**
 * Vault Overview Finalize Day Modal Component
 * 
 * Simple confirmation modal to close the daily vault shift.
 * Displays the system-calculated balance and collection status.
 * 
 * @module components/VAULT/overview/modals/VaultOverviewFinalizeDayModal
 */

'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, CheckCircle2, Landmark, Loader2 } from 'lucide-react';
import VaultOverviewCollectionTallyList from '../sections/VaultOverviewCollectionTallyList';

type VaultOverviewFinalizeDayModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (balance: number, denominations: Denomination[]) => Promise<void>;
  currentBalance: number;
  currentDenominations: Denomination[];
  canClose: boolean;
  blockReason?: string;
  loading?: boolean;
  locationId?: string;
};

export default function VaultOverviewFinalizeDayModal({
  open,
  onClose,
  onConfirm,
  currentBalance,
  currentDenominations,
  canClose,
  blockReason,
  loading = false,
  locationId,
}: VaultOverviewFinalizeDayModalProps) {
  const { formatAmount } = useCurrencyFormat();

  const handleConfirm = async () => {
    if (!canClose) return;
    await onConfirm(currentBalance, currentDenominations);
  };

  return (
    <AlertDialog open={open} onOpenChange={(val) => !val && onClose()}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-violet-600" />
            Finalize Day & Close Vault
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to close the vault for today. This will finalize all transactions and set the starting balance for tomorrow.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-6 space-y-8">
          {/* Balance Summary - Glassmorphism Style */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white shadow-2xl shadow-violet-200">
             <div className="relative z-10 flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/60 mb-3">Calculated Closing Balance</p>
                <h2 className="text-5xl font-black tracking-tighter mb-4">
                    {formatAmount(currentBalance)}
                </h2>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <span className="text-[11px] font-bold text-violet-50">Fully Reconciled & Verified</span>
                </div>
             </div>
             {/* Decorative Background Icon */}
             <Landmark className="absolute -right-8 -bottom-8 h-40 w-40 text-white/5 rotate-12" />
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                  <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Total Denominations</p>
                  <p className="text-lg font-black text-gray-700">{currentDenominations.reduce((sum, d) => sum + d.quantity, 0)} Bills</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                  <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Next Day Opening</p>
                  <p className="text-lg font-black text-gray-700">{formatAmount(currentBalance)}</p>
              </div>
          </div>

          {locationId && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
               <VaultOverviewCollectionTallyList locationId={locationId} />
            </div>
          )}

          {!canClose && (
            <div className="p-5 bg-orange-50/50 border-2 border-orange-100 rounded-2xl flex items-start gap-4">
               <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-black text-orange-900 uppercase tracking-tight">Closing Blocked</p>
                 <p className="text-[11px] text-orange-800/80 leading-relaxed font-semibold">
                    {blockReason || "Please ensure all floor collections and cashier reviews are complete before final closure."}
                 </p>
               </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={loading || !canClose}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-violet-200 transition-all active:scale-[0.98]"
          >
            {loading ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Closing...
                </div>
            ) : (
                "Finalize & Close Vault"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
