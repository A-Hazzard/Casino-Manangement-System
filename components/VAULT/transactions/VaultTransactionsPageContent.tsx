/**
 * Vault Transactions Page Content Component
 *
 * Transaction history page for the Vault Management application.
 *
 * Features:
 * - Summary metrics cards (Total Transactions, Inflow, Outflow, Expenses)
 * - Search and filter functionality
 * - Comprehensive transaction table with pagination
 *
 * @module components/VAULT/pages/VaultTransactionsPageContent
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shared/ui/select';
import VaultTransactionsSkeleton from '@/components/ui/skeletons/VaultTransactionsSkeleton';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import {
    fetchVaultTransactions,
    getTransactionTypeBadge
} from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type { ExtendedVaultTransaction } from '@/shared/types/vault';
import { ArrowDown, ArrowUp, FileText, Receipt, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import VaultTransactionsMobileCards from './cards/VaultTransactionsMobileCards';
import type { TransactionSortOption } from './tables/VaultTransactionsTable';
import VaultTransactionsTable from './tables/VaultTransactionsTable';

export default function VaultTransactionsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ExtendedVaultTransaction[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOption, setSortOption] = useState<TransactionSortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch transactions
  const fetchData = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchVaultTransactions(
        locationId,
        currentPage + 1,
        20,
        selectedType,
        selectedStatus,
        searchTerm
      );
      setTransactions(data.transactions);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedType, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [user?.assignedLocations, currentPage, searchTerm, selectedType, selectedStatus]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Filter and sort transactions based on search term, type, status filters, and sort options
   */
  /**
   * Sort transactions for the current page
   * (Filtering is now handled server-side)
   */
  const filteredAndSortedTransactions = useMemo(() => {
    // Only sort the current page data
    return [...transactions].sort((a, b) => {
        const getField = (obj: any, field: string) => {
            switch(field) {
                case 'date': return new Date(obj.timestamp).getTime();
                case 'user': return (obj.performedByName || obj.performedBy || '').toLowerCase();
                case 'source': return (obj.fromName || '').toLowerCase();
                case 'destination': return (obj.toName || '').toLowerCase();
                case 'amount': return Math.abs(obj.amount);
                case 'type': return (obj.type || '').toLowerCase();
                case 'status': return (obj.isVoid ? 'voided' : 'completed');
                default: return obj[field];
            }
        };

        const aValue = getField(a, sortOption);
        const bValue = getField(b, sortOption);

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }, [
    sortOption,
    sortOrder,
    transactions,
  ]);

  /**
   * Calculate summary metrics from all transactions
   */
  const summaryMetrics = useMemo(() => {
    const totalTransactions = totalItems;
    const totalInflow = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalOutflow = Math.abs(
      transactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    );
    const totalExpenses = Math.abs(
      transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    );

    return {
      totalTransactions,
      totalInflow,
      totalOutflow,
      totalExpenses,
    };
  }, [transactions, totalItems]);

  /**
   * Get badge component for transaction type
   */
  const getTransactionBadge = (type: string) => {
    const badgeConfig = getTransactionTypeBadge(type);
    if (badgeConfig.icon === 'arrow-up') {
      return (
        <Badge className={badgeConfig.className}>
          <ArrowUp className="mr-1 h-3 w-3" />
          {badgeConfig.label}
        </Badge>
      );
    }
    if (badgeConfig.icon === 'arrow-down') {
      return (
        <Badge className={badgeConfig.className}>
          <ArrowDown className="mr-1 h-3 w-3" />
          {badgeConfig.label}
        </Badge>
      );
    }
    if (badgeConfig.icon === 'receipt') {
      return (
        <Badge className={badgeConfig.className}>
          <Receipt className="mr-1 h-3 w-3" />
          {badgeConfig.label}
        </Badge>
      );
    }
    return <Badge>{badgeConfig.label}</Badge>;
  };

  /**
   * Handle table column sort
   */
  const handleSort = (column: TransactionSortOption) => {
    if (sortOption === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(column);
      setSortOrder('asc');
    }
  };

  // Show skeleton while loading
  if (loading && transactions.length === 0) {
    return (
      <PageLayout>
        <VaultTransactionsSkeleton />
      </PageLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <VaultManagerHeader
            title="Transaction History"
            description="Monitor all vault transaction history"
            onFloatActionComplete={() => fetchData()}
        />

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="vault_open">Vault Open</SelectItem>
              <SelectItem value="vault_close">Vault Close</SelectItem>
              <SelectItem value="cashier_shift_open">Cashier Shift Open</SelectItem>
              <SelectItem value="cashier_shift_close">Cashier Shift Close</SelectItem>
              <SelectItem value="machine_collection">Machine Collection</SelectItem>
              <SelectItem value="float_increase">Float Increase</SelectItem>
              <SelectItem value="float_decrease">Float Decrease</SelectItem>
              <SelectItem value="payout">Payout</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="vault_reconciliation">Reconciliation</SelectItem>
              <SelectItem value="soft_count">Soft Count</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Transactions
                  </p>
                  <p className="text-lg font-black text-gray-900 sm:text-xl">
                    {summaryMetrics.totalTransactions}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-violet-50 group-hover:border-violet-100 transition-colors">
                  <FileText className="h-4 w-4 text-gray-400 group-hover:text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                    Total Inflow
                  </p>
                  <p className="text-lg font-black text-emerald-600 sm:text-xl">
                    {formatAmount(summaryMetrics.totalInflow)}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                  <ArrowUp className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">
                    Total Outflow
                  </p>
                  <p className="text-lg font-black text-orange-600 sm:text-xl">
                    {formatAmount(summaryMetrics.totalOutflow)}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100 group-hover:bg-orange-100 transition-colors">
                  <ArrowDown className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">
                    Total Expenses
                  </p>
                  <p className="text-lg font-black text-red-600 sm:text-xl">
                    {formatAmount(summaryMetrics.totalExpenses)}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center border border-red-100 group-hover:bg-red-100 transition-colors">
                  <Receipt className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Details: Responsive Views */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-gray-300">
              <Receipt className="h-4 w-4 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transaction Details
            </h2>
          </div>

          {/* Desktop Table View - lg and above */}
          <div className={loading ? 'pointer-events-none opacity-50' : ''}>
            <VaultTransactionsTable
              transactions={filteredAndSortedTransactions}
              sortOption={sortOption}
              sortOrder={sortOrder}
              onSort={handleSort}
              getTransactionTypeBadge={getTransactionBadge}
              disablePagination={true}
            />
          </div>

          {/* Mobile/Tablet Card View - below lg */}
          <div
            className={
              loading ? 'pointer-events-none opacity-50' : 'block lg:hidden'
            }
          >
            <VaultTransactionsMobileCards
              transactions={filteredAndSortedTransactions}
              getTransactionTypeBadge={getTransactionBadge}
            />
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
    </PageLayout>
  );
}
