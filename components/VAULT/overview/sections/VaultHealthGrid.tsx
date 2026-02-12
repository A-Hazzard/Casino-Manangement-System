/**
 * Vault Health Metrics Grid
 *
 * Displays key financial metrics for the vault.
 * Supports skeleton loading for refreshing state.
 *
 * @module components/VAULT/overview/sections/VaultHealthGrid
 */
'use client';

import DebugSection from '@/components/shared/debug/DebugSection';
import VaultMetricCard from '@/components/VAULT/overview/cards/VaultMetricCard';
import { useUserStore } from '@/lib/store/userStore';
import type { VaultMetrics } from '@/shared/types/vault';
import { CreditCard, DollarSign, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';
import { VaultMetricBreakdownModal } from '../modals/VaultMetricBreakdownModal';

type VaultHealthGridProps = {
  metrics: VaultMetrics;
  refreshing: boolean;
};

export default function VaultHealthGrid({ metrics, refreshing: _refreshing }: VaultHealthGridProps) {
  const [breakdown, setBreakdown] = useState<{ open: boolean; type: 'in' | 'out' | 'payout'; title: string }>({
    open: false,
    type: 'in',
    title: ''
  });

  const { user } = useUserStore();
  const locationId = user?.assignedLocations?.[0] || '';

  const openBreakdown = (type: 'in' | 'out' | 'payout', title: string) => {
    setBreakdown({ open: true, type, title });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Vault Health</h3>
        <DebugSection title="Vault Metrics" data={metrics} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 animate-in fade-in duration-500">
        <VaultMetricCard
          title="Total Cash In"
          value={metrics.totalCashIn}
          icon={Wallet}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          tooltipContent="Sum of all funds added to the vault (Bank, Owner, Machine Drop)."
          onClick={() => openBreakdown('in', 'Total Cash In')}
        />
        <VaultMetricCard
          title="Net Cash Flow"
          value={metrics.netCashFlow}
          icon={DollarSign}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          tooltipContent="Total Cash In - Total Cash Out. Represents the current movement of funds."
        />
        <VaultMetricCard
          title="Total Cash Out"
          value={metrics.totalCashOut}
          icon={CreditCard}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          tooltipContent="Sum of all funds removed from the vault (Deposit, Expense, Transfer)."
          onClick={() => openBreakdown('out', 'Total Cash Out')}
        />
        <VaultMetricCard
          title="Payouts"
          value={metrics.payouts}
          icon={Receipt}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          tooltipContent="Sum/Total of hand pays and ticket redemptions for the current period."
          onClick={() => openBreakdown('payout', 'Payouts')}
        />
      </div>

      <VaultMetricBreakdownModal
        open={breakdown.open}
        onOpenChange={(open) => setBreakdown(prev => ({ ...prev, open }))}
        locationId={locationId || ''}
        type={breakdown.type}
        title={breakdown.title}
      />
    </>
  );
}
