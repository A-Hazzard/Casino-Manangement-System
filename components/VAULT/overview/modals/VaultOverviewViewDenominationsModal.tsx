/**
 * Vault Overview View Denominations Modal
 *
 * Displays the denomination breakdown for a specific cash desk or vault.
 *
 * @module components/VAULT/overview/modals/VaultOverviewViewDenominationsModal
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { Coins, Receipt } from 'lucide-react';

type VaultOverviewViewDenominationsModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  denominations: Denomination[];
  totalAmount: number;
};

export default function VaultOverviewViewDenominationsModal({
  open,
  onClose,
  title,
  denominations = [],
  totalAmount,
}: VaultOverviewViewDenominationsModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();

  // ============================================================================
  // Computed
  // ============================================================================
  // Ensure all denominations are present even if quantity is 0
  const standardDenoms = getDenominationValues(selectedLicencee);
  const displayDenoms = standardDenoms.map(val => {
    const found = denominations.find(d => d.denomination === val);
    return {
      denomination: val,
      quantity: found ? found.quantity : 0,
    };
  });

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Dialog open={open} onOpenChange={val => !val && onClose()}>
      <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-md">
        <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Coins className="h-5 w-5 text-violet-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:max-h-[75vh]">
          <div className="grid grid-cols-2 gap-3">
            {displayDenoms.map(displayDenom => (
              <div
                key={displayDenom.denomination}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-3 transition-all',
                  displayDenom.quantity > 0
                    ? 'border-violet-100 bg-white shadow-sm'
                    : 'border-gray-100 bg-gray-50/50 opacity-60'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-[10px] font-black',
                      displayDenom.quantity > 0
                        ? 'border border-violet-100 text-violet-600'
                        : 'border border-transparent text-gray-400'
                    )}
                  >
                    ${displayDenom.denomination}
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400">
                    Bills
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black leading-none text-gray-900">
                    x{displayDenom.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-xl shadow-violet-500/20">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-violet-100/60">
                  Verified Total Balance
                </p>
                <span className="text-3xl font-black tracking-tight">
                  {formatAmount(totalAmount)}
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm">
                <Receipt className="h-6 w-6 text-violet-100" />
              </div>
            </div>
            <Coins className="absolute -bottom-4 -right-4 h-20 w-20 rotate-12 text-white/5" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
