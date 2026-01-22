/**
 * Vault Transfers Page Content Component
 *
 * Transfers page for the Vault Management application.
 *
 * Features:
 * - Summary metrics cards
 * - New Transfer button
 * - Pending Transfers table
 * - Transfer History table
 *
 * @module components/VAULT/pages/VaultTransfersPageContent
 */
'use client';

import { useState, useMemo } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { mockVaultTransfers, mockVaultBalance } from '@/components/VAULT/overview/data/mockData';
import type { VaultTransfer } from '@/shared/types/vault';
import type { TransferSortOption } from './tables/VaultTransfersTable';
import VaultTransfersTable from './tables/VaultTransfersTable';
import VaultTransfersMobileCards from './cards/VaultTransfersMobileCards';
import { Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function VaultTransfersPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const [sortOption, setSortOption] = useState<TransferSortOption>('dateTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Filter transfers with pending status
   */
  const pendingTransfers = mockVaultTransfers.filter((t: VaultTransfer) => t.status === 'pending');

  /**
   * Sum of amounts for all pending transfers
   */
  const pendingAmount = pendingTransfers.reduce((sum: number, t: VaultTransfer) => sum + t.amount, 0);

  /**
   * Count of transfers completed today
   * Filters by status and date string match
   */
  const completedToday = mockVaultTransfers.filter(
    (t: VaultTransfer) => t.status === 'completed' && t.dateTime.includes('20/01/2024')
  ).length;

  /**
   * Sort all transfers based on sort option and order
   */
  const sortedTransfers = useMemo(() => {
    const sorted = [...mockVaultTransfers].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption) {
        case 'dateTime':
          aValue = new Date(a.dateTime).getTime();
          bValue = new Date(b.dateTime).getTime();
          break;
        case 'from':
          aValue = a.from.toLowerCase();
          bValue = b.from.toLowerCase();
          break;
        case 'to':
          aValue = a.to.toLowerCase();
          bValue = b.to.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'initiatedBy':
          aValue = a.initiatedBy.toLowerCase();
          bValue = b.initiatedBy.toLowerCase();
          break;
        case 'approvedBy':
          aValue = (a.approvedBy || '').toLowerCase();
          bValue = (b.approvedBy || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
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

  /**
   * Sort pending transfers
   */
  const sortedPendingTransfers = useMemo(() => {
    return sortedTransfers.filter(t => t.status === 'pending');
  }, [sortedTransfers]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle new transfer button click
   * Placeholder for future modal implementation
   */
  const handleNewTransfer = () => {
    toast.info('New Transfer modal will be implemented');
  };

  /**
   * Handle approve transfer action
   * Placeholder for future API integration
   *
   * @param transferId - ID of transfer to approve
   */
  const handleApprove = (transferId: string) => {
    toast.success(`Transfer ${transferId} approved`);
  };

  /**
   * Handle reject transfer action
   * Placeholder for future API integration
   *
   * @param transferId - ID of transfer to reject
   */
  const handleReject = (transferId: string) => {
    toast.error(`Transfer ${transferId} rejected`);
  };

  /**
   * Handle table column sort
   * Toggles sort order if clicking the same column, otherwise sets new sort column
   *
   * @param column - Column to sort by
   */
  const handleSort = (column: TransferSortOption) => {
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Transfers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Transfer funds between vaults, cash desks, and banks
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vault Balance</p>
                <p className="break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                  {formatAmount(mockVaultBalance.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Transfers</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                  {pendingTransfers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="break-words text-xl font-bold text-button sm:text-2xl">
                  {formatAmount(pendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Transfer Button */}
      <div>
        <Button
          onClick={handleNewTransfer}
          className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          New Transfer
        </Button>
      </div>

      {/* Pending Transfers Section */}
      {sortedPendingTransfers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orangeHighlight" />
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Transfers ({sortedPendingTransfers.length})
            </h2>
          </div>

          {/* Desktop Table View - lg and above */}
          <VaultTransfersTable
            transfers={sortedPendingTransfers}
            sortOption={sortOption}
            sortOrder={sortOrder}
            onSort={handleSort}
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={true}
          />

          {/* Mobile/Tablet Card View - below lg */}
          <VaultTransfersMobileCards
            transfers={sortedPendingTransfers}
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={true}
          />
        </div>
      )}

      {/* Transfer History Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Transfer History</h2>

        {/* Desktop Table View - lg and above */}
        <VaultTransfersTable
          transfers={sortedTransfers}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        {/* Mobile/Tablet Card View - below lg */}
        <VaultTransfersMobileCards transfers={sortedTransfers} />
      </div>
      </div>
    </PageLayout>
  );
}
