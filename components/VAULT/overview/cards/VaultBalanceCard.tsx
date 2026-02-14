/**
 * Vault Balance Card Component
 *
 * Large prominent card displaying vault balance, last audit, and manager on duty.
 *
 * Features:
 * - Vault balance display
 * - Last audit timestamp
 * - Manager on duty information
 * - Prominent styling
 *
 * @module components/VAULT/cards/VaultBalanceCard
 */
'use client';

import DebugSection from '@/components/shared/debug/DebugSection';
import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { VaultBalance } from '@/shared/types/vault';
import { RefreshCw } from 'lucide-react';

type VaultBalanceCardProps = {
  balance: VaultBalance;
  onReconcile?: () => void;
};

export default function VaultBalanceCard({
  balance,
  onReconcile,
}: VaultBalanceCardProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // Helper to determine font size based on amount string length
  const getDynamicFontSize = (text: string, baseSize: string, mediumSize: string, smallSize: string) => {
    if (text.length > 15) return smallSize;
    if (text.length > 12) return mediumSize;
    return baseSize;
  };

  const balanceStr = formatAmount(balance.balance);
  const premisesStr = formatAmount(balance.totalCashOnPremises || balance.balance);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Card className="w-full rounded-lg bg-container shadow-md">
      <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg text-gray-700 sm:text-xl">
            Vault Status
          </CardTitle>
          <DebugSection title="Vault Balance Data" data={balance} />
        </div>
        {onReconcile && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReconcile}
            disabled={!balance.activeShiftId}
            className={cn(
               "h-8 w-full sm:w-auto gap-2 border-orangeHighlight text-orangeHighlight hover:bg-orangeHighlight/10 transition-all",
               !balance.activeShiftId && "opacity-40",
               balance.activeShiftId && !balance.isReconciled && "animate-pulse ring-2 ring-orangeHighlight/50 bg-orange-50"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", balance.activeShiftId && !balance.isReconciled && "animate-spin")} />
            {balance.isReconciled ? 'Reconcile' : 'Reconciliation of Vault Required'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* Vault Balance */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600">
              Current Vault Balance
            </p>
            <p className={cn(
                "mt-1 font-bold text-gray-900 leading-none transition-all duration-300 truncate",
                getDynamicFontSize(balanceStr, "text-2xl sm:text-3xl md:text-4xl", "text-xl sm:text-2xl md:text-3xl", "text-lg sm:text-xl md:text-2xl")
            )}>
              {balanceStr}
            </p>
            {balance.openingBalance !== undefined && (
              <p className="mt-1 text-xs text-gray-500 font-medium truncate">
                Started with: <span className="text-gray-900">{formatAmount(balance.openingBalance)}</span>
              </p>
            )}
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Last Audit */}
          <div className="flex-1 md:pt-0 min-w-0">
            <p className="text-sm font-medium text-gray-600">Last Audit</p>
            <p className="mt-1 text-lg text-gray-900 truncate">
              {balance.lastAudit && balance.lastAudit !== 'Never' ? new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              }).format(new Date(balance.lastAudit)) : 'Never'}
            </p>
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Manager on Duty */}
          <div className="flex-1 md:pt-0 min-w-0">
            <p className="text-sm font-medium text-gray-600">Manager on Duty</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 truncate">
              {balance.managerOnDuty}
            </p>
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Premises Metrics */}
          <div className="flex-1 md:pt-0 min-w-0">
            <p className="text-sm font-medium text-orangeHighlight">Cash on Premises</p>
            <p className={cn(
                "mt-1 font-bold text-gray-900 leading-none transition-all duration-300 truncate",
                getDynamicFontSize(premisesStr, "text-2xl", "text-xl", "text-lg")
            )}>
              {premisesStr}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-gray-500 font-mono overflow-hidden">
              <span className="truncate" title="Machine Money In">Machines' Soft Count: {formatAmount(balance.machineMoneyIn || 0)}</span>
              <span className="truncate" title="Total Active Cashier Floats">Cashiers' Float: {formatAmount(balance.cashierFloats || 0)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
