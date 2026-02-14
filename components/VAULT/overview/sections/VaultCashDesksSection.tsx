/**
 * Cash Desks Section
 *
 * Displays status cards for all cashier desks.
 *
 * @module components/VAULT/overview/sections/VaultCashDesksSection
 */
'use client';

import VaultCashDeskCard from '@/components/VAULT/overview/cards/VaultCashDeskCard';
import DebugSection from '@/components/shared/debug/DebugSection';
import type { CashDesk } from '@/shared/types/vault';

type VaultCashDesksSectionProps = {
  cashDesks: CashDesk[];
  refreshing: boolean;
  onViewDenominations: (cashDesk: CashDesk) => void;
};

export default function VaultCashDesksSection({
  cashDesks,
  refreshing: _refreshing,
  onViewDenominations,
}: VaultCashDesksSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Cash Desks Status
        </h2>
        <DebugSection title="Cash Desks" data={cashDesks} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cashDesks.length > 0 ? (
          [...cashDesks]
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 4)
            .map(cashDesk => (
              <VaultCashDeskCard 
                key={cashDesk._id} 
                cashDesk={cashDesk} 
                onViewDenominations={() => onViewDenominations(cashDesk)}
              />
            ))
        ) : (
          <p className="text-sm text-gray-500">No active cash desks.</p>
        )}
      </div>
    </div>
  );
}
