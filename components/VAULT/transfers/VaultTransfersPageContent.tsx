/**
 * Vault Transfers Page Content Component
 *
 * Transfers page for Vault Management application.
 *
 * Features:
 * - Summary metrics cards
 * - New Transfer button
 * - Pending Transfers table
 * - Transfer History table with pagination
 *
 * @module components/VAULT/pages/VaultTransfersPageContent
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import VaultTransfersSkeleton from '@/components/ui/skeletons/VaultTransfersSkeleton';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import { DEFAULT_VAULT_BALANCE } from '@/components/VAULT/overview/data/defaults';
import {
    fetchVaultBalance,
    fetchVaultTransfers,
    handleApproveTransfer,
    handleRejectTransfer,
    handleTransferSubmit,
    sortTransfers,
} from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type {
    Denomination,
    VaultBalance,
    VaultTransfer,
} from '@/shared/types/vault';
import { Clock, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import VaultTransfersMobileCards from './cards/VaultTransfersMobileCards';
import InterLocationTransferForm from './InterLocationTransferForm';
import type { TransferSortOption } from './tables/VaultTransfersTable';
import VaultTransfersTable from './tables/VaultTransfersTable';

export default function VaultTransfersPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user, hasActiveVaultShift } = useUserStore();
  const { formatAmount } = useCurrencyFormat();
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<TransferSortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transfers, setTransfers] = useState<VaultTransfer[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [vaultBalance, setVaultBalance] = useState<VaultBalance>(
    DEFAULT_VAULT_BALANCE
  );
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Fetch data
  const fetchData = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [transfersResult, balanceData] = await Promise.all([
        fetchVaultTransfers(locationId, currentPage + 1, 20),
        fetchVaultBalance(locationId),
      ]);

      setTransfers(transfersResult.transfers);
      setTotalPages(transfersResult.totalPages);
      setTotalItems(transfersResult.total);

      if (balanceData) {
        setVaultBalance({
          ...balanceData,
          managerOnDuty: user?.username || 'Loading...',
        });
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Failed to load transfers data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.assignedLocations, user?.username, currentPage]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Filter transfers with pending status
   */
  const pendingTransfers = useMemo(() => {
    return transfers.filter(t => t.status === 'pending');
  }, [transfers]);

  /**
   * Sum of amounts for all pending transfers
   */
  const pendingAmount = useMemo(() => {
    return pendingTransfers.reduce((sum, t) => sum + t.amount, 0);
  }, [pendingTransfers]);

  /**
   * Count of transfers completed today
   */
  const completedToday = useMemo(() => {
    return transfers.filter(t => {
      if (t.status !== 'completed' && t.status !== 'approved') return false;
      const transferDate = new Date(t.date || t.createdAt || '');
      const today = new Date();
      return transferDate.toDateString() === today.toDateString();
    }).length;
  }, [transfers]);

  /**
   * Sort all transfers based on sort option and order
   */
  const sortedTransfers = useMemo(() => {
    return sortTransfers(transfers, sortOption, sortOrder);
  }, [sortOption, sortOrder, transfers]);

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
   */
  const handleNewTransfer = () => {
    if (!hasActiveVaultShift) {
      toast.error('Operation Blocked', {
        description: 'You must start a vault shift before initiating a transfer.'
      });
      return;
    }
    setIsTransferModalOpen(true);
  };

  /**
   * Handle inter-location transfer submission
   */
  const handleTransferSubmitModal = async (
    fromLocation: string,
    toLocation: string,
    amount: number,
    denominations: Denomination[],
    notes?: string
  ) => {
    setSubmittingTransfer(true);
    try {
      const result = await handleTransferSubmit(
        fromLocation,
        toLocation,
        amount,
        denominations,
        notes
      );

      if (result.success) {
        toast.success(
          `Transfer request submitted: $${amount.toLocaleString()}`
        );
        setIsTransferModalOpen(false);
        fetchData(); // Refresh list
      } else {
        toast.error(result.error || 'Failed to submit transfer');
      }
    } catch (error) {
      console.error('Error submitting transfer:', error);
      toast.error('An error occurred while submitting transfer');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  /**
   * Handle approve transfer action
   */
  const handleApprove = async (transferId: string) => {
    const result = await handleApproveTransfer(transferId);
    if (result.success) {
      toast.success('Transfer approved');
      fetchData(); // Refresh data for consistency
    } else {
      toast.error(result.error || 'Failed to approve transfer');
    }
  };

  /**
   * Handle reject transfer action
   */
  const handleReject = async (transferId: string) => {
    const result = await handleRejectTransfer(transferId);
    if (result.success) {
      toast.error('Transfer rejected');
      fetchData(); // Refresh data
    } else {
      toast.error(result.error || 'Failed to reject transfer');
    }
  };

  /**
   * Handle table column sort
   */
  const handleSort = (column: TransferSortOption) => {
    if (sortOption === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(column);
      setSortOrder('asc');
    }
  };

  // Show skeleton while loading
  if (loading && transfers.length === 0) {
    return (
      <PageLayout>
        <VaultTransfersSkeleton />
      </PageLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout>
      <div className="space-y-6">
        <VaultManagerHeader 
          title="Transfers" 
          description="Transfer funds between vaults, cash desks, and banks" 
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Vault Balance
                  </p>
                  <p className="break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                    {formatAmount(vaultBalance.balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Transfers
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">
                    Pending Amount
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">
                    Completed Today
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Transfer Button */}
        <div>
          <Button
            onClick={handleNewTransfer}
            className={cn(
              "bg-orangeHighlight text-white hover:bg-orangeHighlight/90",
              !hasActiveVaultShift && "opacity-40 cursor-not-allowed"
            )}
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
            <div className={loading ? 'pointer-events-none opacity-50' : ''}>
              <VaultTransfersTable
                transfers={sortedPendingTransfers}
                sortOption={sortOption}
                sortOrder={sortOrder}
                onSort={handleSort}
                onApprove={handleApprove}
                onReject={handleReject}
                showActions={true}
              />
            </div>

            {/* Mobile/Tablet Card View - below lg */}
            <div
              className={
                loading ? 'pointer-events-none opacity-50' : 'block lg:hidden'
              }
            >
              <VaultTransfersMobileCards
                transfers={sortedPendingTransfers}
                onApprove={handleApprove}
                onReject={handleReject}
                showActions={true}
              />
            </div>
          </div>
        )}

        {/* Transfer History Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Transfer History
          </h2>

          {/* Desktop Table View - lg and above */}
          <div className={loading ? 'pointer-events-none opacity-50' : ''}>
            <VaultTransfersTable
              transfers={sortedTransfers}
              sortOption={sortOption}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </div>

          {/* Mobile/Tablet Card View - below lg */}
          <div
            className={
              loading ? 'pointer-events-none opacity-50' : 'block lg:hidden'
            }
          >
            <VaultTransfersMobileCards transfers={sortedTransfers} />
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                totalCount={totalItems}
                limit={20}
              />
            </div>
          )}
        </div>
      </div>

      {/* Inter-Location Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Inter-Location Transfer</DialogTitle>
            <DialogDescription>
              Initiate a cash transfer request between locations.
            </DialogDescription>
          </DialogHeader>
          <InterLocationTransferForm
            onSubmit={handleTransferSubmitModal}
            loading={submittingTransfer}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
