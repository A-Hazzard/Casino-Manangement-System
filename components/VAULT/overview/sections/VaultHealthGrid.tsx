/**
 * Vault Health Metrics Grid
 *
 * Displays key financial metrics for the vault.
 * Supports skeleton loading for refreshing state.
 *
 * @module components/VAULT/overview/sections/VaultHealthGrid
 */
'use client';

import VaultMetricCard from '@/components/VAULT/overview/cards/VaultMetricCard';
import type { VaultMetrics } from '@/shared/types/vault';
import { CreditCard, DollarSign, TrendingUp, Wallet } from 'lucide-react';

type VaultHealthGridProps = {
  metrics: VaultMetrics;
  refreshing: boolean;
};

export default function VaultHealthGrid({ metrics, refreshing: _refreshing }: VaultHealthGridProps) {
  // Only show skeletons on initial load, background refreshes should be silent
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-500">
      <VaultMetricCard
        title="Total Cash In"
        value={metrics.totalCashIn}
        icon={Wallet}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-100"
      />
      <VaultMetricCard
        title="Total Cash Out"
        value={metrics.totalCashOut}
        icon={CreditCard}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-100"
      />
      <VaultMetricCard
        title="Net Cash Flow"
        value={metrics.netCashFlow}
        icon={DollarSign}
        iconColor="text-orange-600"
        iconBgColor="bg-orange-100"
      />
      <VaultMetricCard
        title="Payouts"
        value={metrics.payouts}
        icon={TrendingUp}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-100"
      />
    </div>
  );
}
