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

import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
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

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Card className="w-full rounded-lg bg-container shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg text-gray-700 sm:text-xl">
          Vault Status
        </CardTitle>
        {onReconcile && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReconcile}
            className="h-8 gap-2 text-orangeHighlight hover:text-orangeHighlight/80"
          >
            <RefreshCw className="h-4 w-4" />
            Reconcile
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* Vault Balance */}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">
              Current Vault Balance
            </p>
            <p className="mt-1 break-words text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
              {formatAmount(balance.balance)}
            </p>
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Last Audit */}
          <div className="flex-1 md:pt-0">
            <p className="text-sm font-medium text-gray-600">Last Audit</p>
            <p className="mt-1 text-lg text-gray-900">{balance.lastAudit}</p>
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Manager on Duty */}
          <div className="flex-1 md:pt-0">
            <p className="text-sm font-medium text-gray-600">Manager on Duty</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {balance.managerOnDuty}
            </p>
          </div>

          {/* Vertical Divider - Desktop Only */}
          <div className="hidden border-l border-gray-200 md:block"></div>
          {/* Horizontal Divider - Mobile Only */}
          <div className="border-t border-gray-200 pt-4 md:hidden"></div>

          {/* Premises Metrics */}
          <div className="flex-1 md:pt-0">
            <p className="text-sm font-medium text-orangeHighlight">Cash on Premises</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatAmount(balance.totalCashOnPremises || balance.balance)}
            </p>
            <div className="mt-1 flex gap-3 text-[10px] uppercase tracking-wider text-gray-500 font-mono">
              <span title="Machine Money In">M: {formatAmount(balance.machineMoneyIn || 0)}</span>
              <span title="Total Active Cashier Floats">F: {formatAmount(balance.cashierFloats || 0)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
