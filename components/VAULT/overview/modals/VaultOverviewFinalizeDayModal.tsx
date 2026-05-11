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
    <AlertDialog open={open} onOpenChange={val => !val && onClose()}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-violet-600" />
            Finalize Day & Close Vault
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to close the vault for today. This will finalize all
            transactions and set the starting balance for tomorrow.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-8 py-6">
          {/* Balance Summary - Glassmorphism Style */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white shadow-2xl shadow-violet-200">
            <div className="relative z-10 flex flex-col items-center">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/60">
                Calculated Closing Balance
              </p>
              <h2 className="mb-4 text-5xl font-black tracking-tighter">
                {formatAmount(currentBalance)}
              </h2>
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span className="text-[11px] font-bold text-violet-50">
                  Fully Reconciled & Verified
                </span>
              </div>
            </div>
            {/* Decorative Background Icon */}
            <Landmark className="absolute -bottom-8 -right-8 h-40 w-40 rotate-12 text-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
              <p className="mb-1 text-[9px] font-black uppercase text-gray-400">
                Total Denominations
              </p>
              <p className="text-lg font-black text-gray-700">
                {currentDenominations.reduce((sum, d) => sum + d.quantity, 0)}{' '}
                Bills
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
              <p className="mb-1 text-[9px] font-black uppercase text-gray-400">
                Next Day Opening
              </p>
              <p className="text-lg font-black text-gray-700">
                {formatAmount(currentBalance)}
              </p>
            </div>
          </div>

          {locationId && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <VaultOverviewCollectionTallyList locationId={locationId} />
            </div>
          )}

          {!canClose && (
            <div className="flex items-start gap-4 rounded-2xl border-2 border-orange-100 bg-orange-50/50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-tight text-orange-900">
                  Closing Blocked
                </p>
                <p className="text-[11px] font-semibold leading-relaxed text-orange-800/80">
                  {blockReason ||
                    'Please ensure all floor collections and cashier reviews are complete before final closure.'}
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
            className="h-11 rounded-xl bg-violet-600 px-8 font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Closing...
              </div>
            ) : (
              'Finalize & Close Vault'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
