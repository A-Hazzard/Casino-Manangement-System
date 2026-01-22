/**
 * Vault Payouts Page Content Component
 *
 * Player payouts page for the Vault Management application.
 *
 * Features:
 * - Summary metrics cards (Today's Payouts, Total Amount, Average Payout)
 * - New Payout button
 * - Recent Payouts table
 *
 * @module components/VAULT/cashier/payouts/VaultPayoutsPageContent
 */
'use client';

import { useState, useMemo } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { PayoutSortOption } from './tables/VaultPayoutsTable';
import VaultPayoutsTable from './tables/VaultPayoutsTable';
import VaultPayoutsMobileCards from './cards/VaultPayoutsMobileCards';
import { DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Mock data for payouts
const mockPayouts = [
  {
    id: '1',
    ticketNumber: 'TKT-789456123',
    amount: 1250,
    player: 'John Smith',
    cashier: 'Sarah Johnson',
    station: 'Desk 1',
    processed: '20/01/2024, 11:45:00 am',
    notes: 'Jackpot payout - verified',
  },
  {
    id: '2',
    ticketNumber: 'TKT-456789012',
    amount: 85,
    player: 'Jane Doe',
    cashier: 'Mike Chen',
    station: 'Desk 2',
    processed: '20/01/2024, 10:30:00 am',
    notes: 'Large payout - ID verified',
  },
  {
    id: '3',
    ticketNumber: 'TKT-123456789',
    amount: 3750,
    player: 'Bob Wilson',
    cashier: 'Sarah Johnson',
    station: 'Desk 1',
    processed: '20/01/2024, 09:15:00 am',
    notes: 'Progressive jackpot',
  },
];

export default function VaultPayoutsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const [sortOption, setSortOption] = useState<PayoutSortOption>('processed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Count of payouts for today
   */
  const todaysPayouts = mockPayouts.length;

  /**
   * Sum of all payout amounts
   */
  const totalAmount = mockPayouts.reduce((sum, p) => sum + p.amount, 0);

  /**
   * Average payout amount
   * Returns 0 if no payouts exist
   */
  const averagePayout =
    mockPayouts.length > 0 ? totalAmount / mockPayouts.length : 0;

  /**
   * Sort payouts based on sort option and order
   */
  const sortedPayouts = useMemo(() => {
    const sorted = [...mockPayouts].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption) {
        case 'ticketNumber':
          aValue = a.ticketNumber.toLowerCase();
          bValue = b.ticketNumber.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'player':
          aValue = a.player.toLowerCase();
          bValue = b.player.toLowerCase();
          break;
        case 'cashier':
          aValue = a.cashier.toLowerCase();
          bValue = b.cashier.toLowerCase();
          break;
        case 'station':
          aValue = a.station.toLowerCase();
          bValue = b.station.toLowerCase();
          break;
        case 'processed':
          aValue = new Date(a.processed).getTime();
          bValue = new Date(b.processed).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sortOption, sortOrder]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle new payout button click
   * Placeholder for future modal implementation
   */
  const handleNewPayout = () => {
    toast.info('New Payout modal will be implemented');
  };

  /**
   * Handle table column sort
   * Toggles sort order if clicking the same column, otherwise sets new sort column
   *
   * @param column - Column to sort by
   */
  const handleSort = (column: PayoutSortOption) => {
    if (sortOption === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(column);
      setSortOrder('asc');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Player Payouts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Process player ticket payouts and verify winnings
          </p>
        </div>
        <Button
          onClick={handleNewPayout}
          className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
          size="lg"
        >
          <DollarSign className="mr-2 h-5 w-5" />
          New Payout
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Payouts</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{todaysPayouts}</p>
              </div>
              <FileText className="h-8 w-8 text-orangeHighlight" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                  {formatAmount(totalAmount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orangeHighlight" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Payout</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                  {formatAmount(averagePayout)}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-orangeHighlight" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payouts: Responsive Views */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
            <DollarSign className="h-4 w-4 text-orangeHighlight" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Payouts</h2>
        </div>

        {/* Desktop Table View - lg and above */}
        <VaultPayoutsTable
          payouts={sortedPayouts}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        {/* Mobile/Tablet Card View - below lg */}
        <VaultPayoutsMobileCards payouts={sortedPayouts} />
      </div>
      </div>
    </PageLayout>
  );
}
