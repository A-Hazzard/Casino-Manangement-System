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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import type { VaultBalance } from '@/shared/types/vault';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

type VaultBalanceCardProps = {
  balance: VaultBalance;
};

export default function VaultBalanceCard({ balance }: VaultBalanceCardProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Card className="w-full rounded-lg bg-container shadow-md">
      <CardHeader>
        <CardTitle className="text-lg text-gray-700 sm:text-xl">
          Vault Status
        </CardTitle>
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
        </div>
      </CardContent>
    </Card>
  );
}
