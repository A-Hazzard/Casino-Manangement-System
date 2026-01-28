/**
 * Vault Payouts Page Content Component
 *
 * Player payouts page for the Vault Management application.
 *
 * Features:
 * - Summary metrics cards (Today's Payouts count)
 * - Payouts table with server-side pagination (simplified to client sort for now or API sort)
 *
 * @module components/VAULT/cashier/payouts/VaultPayoutsPageContent
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { CheckCircle2, DollarSign, FileText, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import VaultPayoutsMobileCards from './cards/VaultPayoutsMobileCards';
import type { PayoutSortOption } from './tables/VaultPayoutsTable';
import VaultPayoutsTable from './tables/VaultPayoutsTable';

export default function VaultPayoutsPageContent() {
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [sortOption, setSortOption] = useState<PayoutSortOption>('processed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [totalCount, setTotalCount] = useState(0);

  // Fetch Payouts
  const fetchPayouts = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) return;

    setLoading(true);
    try {
        const res = await fetch(`/api/vault/payouts?locationId=${locationId}&limit=50`); // Fetch 50 for now
        const data = await res.json();
        if (data.success) {
            setPayouts(data.payouts.map((p: any) => ({
                id: p._id,
                ticketNumber: p.ticketNumber || 'N/A',
                amount: p.amount,
                player: 'N/A', // Not stored
                cashier: p.cashierId || 'Unknown',
                station: 'Vault',
                processed: p.createdAt || p.timestamp,
                notes: p.notes
            })));
            setTotalCount(data.pagination.total);
        } else {
            toast.error('Failed to fetch payouts');
        }
    } catch (error) {
        toast.error('Connection error');
        console.error('Failed to fetch payouts', error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [user?.assignedLocations]);

  // Computed Values
  const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0); // Only of fetched items
  const averagePayout = payouts.length > 0 ? totalAmount / payouts.length : 0;

  const sortedPayouts = useMemo(() => {
    return [...payouts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOption) {
        case 'ticketNumber':
          aValue = (a.ticketNumber || '').toLowerCase();
          bValue = (b.ticketNumber || '').toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'cashier':
          aValue = (a.cashier || '').toLowerCase();
          bValue = (b.cashier || '').toLowerCase();
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
  }, [payouts, sortOption, sortOrder]);

  const handleNewPayout = () => {
    toast.info('Use Cashier Dashboard for new Payouts');
  };

  const handleSort = (column: PayoutSortOption) => {
    if (sortOption === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(column);
      setSortOrder('asc');
    }
  };

  if (loading && payouts.length === 0) {
      return (
        <PageLayout showHeader={false}>
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        </PageLayout>
      );
  }

  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Player Payouts</h1>
          <p className="mt-1 text-sm text-gray-600">
            History of processed player payouts.
          </p>
        </div>
        <Button
          onClick={handleNewPayout}
          variant="outline"
        >
          New Payout (Go to Dashboard)
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payouts (All Time)</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{totalCount}</p>
              </div>
              <FileText className="h-8 w-8 text-orangeHighlight" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Visible Total</p>
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
                <p className="text-sm font-medium text-gray-600">Visible Avg</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                  {formatAmount(averagePayout)}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-orangeHighlight" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
                    <DollarSign className="h-4 w-4 text-orangeHighlight" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Payouts</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchPayouts}><RefreshCw className="h-4 w-4 mr-2"/> Refresh</Button>
        </div>

        <VaultPayoutsTable
          payouts={sortedPayouts}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        <div className="block lg:hidden">
             <VaultPayoutsMobileCards payouts={sortedPayouts} />
        </div>
      </div>
      </div>
    </PageLayout>
  );
}
