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
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type { VaultBalance } from '@/shared/types/vault';
import { RefreshCw } from 'lucide-react';

type VaultBalanceCardProps = {
  balance: VaultBalance;
  onReconcile?: () => void;
  onViewDenominations?: () => void;
  isStaleShift?: boolean;
};

export default function VaultBalanceCard({
  balance,
  onReconcile,
  onViewDenominations,
  isStaleShift = false,
}: VaultBalanceCardProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Handlers
  // ============================================================================

  // Helper to determine font size based on amount string length
  const getDynamicFontSize = (
    text: string,
    baseSize: string,
    mediumSize: string,
    smallSize: string,
    tinySize: string
  ) => {
    if (text.length > 18) return tinySize;
    if (text.length > 15) return smallSize;
    if (text.length > 12) return mediumSize;
    return baseSize;
  };

  // ============================================================================
  // Computed
  // ============================================================================
  const balanceStr = formatAmount(balance.balance);
  const premisesStr = formatAmount(
    balance.totalCashOnPremises || balance.balance
  );

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
        {onReconcile && balance.activeShiftId && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReconcile}
            disabled={!balance.activeShiftId || isStaleShift}
            className={cn(
              'h-8 w-full gap-2 border-orangeHighlight text-orangeHighlight transition-all hover:bg-orangeHighlight/10 sm:w-auto',
              (!balance.activeShiftId || isStaleShift) &&
                'cursor-not-allowed opacity-40',
              balance.activeShiftId &&
                !balance.isReconciled &&
                !isStaleShift &&
                'animate-pulse bg-orange-50 ring-2 ring-orangeHighlight/50'
            )}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                balance.activeShiftId &&
                  !balance.isReconciled &&
                  !isStaleShift &&
                  'animate-spin'
              )}
            />
            {balance.isReconciled
              ? 'Reconcile'
              : 'Reconciliation of Vault Required'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* Vault Balance */}
          <div
            className={cn(
              '-m-2 min-w-0 flex-1 rounded-lg p-2 transition-all duration-200',
              onViewDenominations &&
                'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
            )}
            onClick={onViewDenominations}
            title={
              onViewDenominations
                ? 'Click to view denomination breakdown'
                : undefined
            }
          >
            <p className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
              Current Vault Balance
              {onViewDenominations && (
                <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-500 opacity-0 transition-opacity group-hover:opacity-100">
                  View Setup
                </span>
              )}
            </p>
            <p
              className={cn(
                'mt-1 break-words font-bold leading-tight text-gray-900 transition-all duration-300',
                getDynamicFontSize(
                  balanceStr,
                  'text-2xl sm:text-2xl md:text-3xl',
                  'text-xl sm:text-xl md:text-2xl',
                  'text-lg sm:text-lg md:text-xl',
                  'text-base sm:text-base md:text-lg'
                )
              )}
            >
              {balanceStr}
            </p>
            {balance.openingBalance !== undefined && (
              <p className="mt-1 truncate text-xs font-medium text-gray-500">
                Started with:{' '}
                <span className="text-gray-900">
                  {formatAmount(balance.openingBalance)}
                </span>
              </p>
            )}
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Last Reconcile */}
          <div className="min-w-0 flex-1 md:pt-0">
            <p className="text-sm font-medium text-gray-600">Last Reconcile</p>
            <p className="mt-1 truncate text-lg text-gray-900">
              {balance.lastAudit && balance.lastAudit !== 'Never'
                ? safeFormatDate(balance.lastAudit)
                : 'Never'}
            </p>
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Manager on Duty */}
          <div className="min-w-0 flex-1 md:pt-0">
            <p className="text-sm font-medium text-gray-600">Manager on Duty</p>
            <p className="mt-1 truncate text-lg font-semibold text-gray-900">
              {balance.managerOnDuty}
            </p>
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Premises Metrics */}
          <div className="min-w-0 flex-1 md:pt-0">
            <p className="text-sm font-medium text-orangeHighlight">
              Cash on Premises
            </p>
            <p
              className={cn(
                'mt-1 break-words font-bold leading-tight text-gray-900 transition-all duration-300',
                getDynamicFontSize(
                  premisesStr,
                  'text-2xl',
                  'text-xl',
                  'text-lg',
                  'text-base'
                )
              )}
            >
              {premisesStr}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 overflow-hidden font-mono text-[10px] uppercase tracking-wider text-gray-500">
              <span className="truncate" title="Machine Money In">
                Machines' Soft Count:{' '}
                {formatAmount(balance.machineMoneyIn || 0)}
              </span>
              <span className="truncate" title="Total Active Cashier Floats">
                Cashiers' Float: {formatAmount(balance.cashierFloats || 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
