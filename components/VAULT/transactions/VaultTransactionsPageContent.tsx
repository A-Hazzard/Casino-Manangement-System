/**
 * Vault Transactions Page Content Component
 *
 * Transaction history page for the Vault Management application.
 *
 * Features:
 * - Summary metrics cards (Total Transactions, Inflow, Outflow, Expenses)
 * - Search and filter functionality
 * - Comprehensive transaction table
 *
 * @module components/VAULT/pages/VaultTransactionsPageContent
 */
'use client';

import { useState, useMemo } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { mockExtendedTransactions } from '@/components/VAULT/overview/data/mockData';
import type {
  ExtendedVaultTransaction,
  VaultTransactionType,
} from '@/shared/types/vault';
import type { TransactionSortOption } from './tables/VaultTransactionsTable';
import VaultTransactionsTable from './tables/VaultTransactionsTable';
import VaultTransactionsMobileCards from './cards/VaultTransactionsMobileCards';
import { Search, ArrowUp, ArrowDown, Receipt, FileText } from 'lucide-react';

export default function VaultTransactionsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOption, setSortOption] = useState<TransactionSortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Filter and sort transactions based on search term, type, status filters, and sort options
   * Searches across user, source, destination, and notes fields
   */
  const filteredAndSortedTransactions = useMemo(() => {
    // First filter
    let filtered = mockExtendedTransactions.filter((tx: ExtendedVaultTransaction) => {
      const matchesSearch =
        searchTerm === '' ||
        tx.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || tx.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || tx.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

    // Then sort
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption) {
        case 'date':
          // Parse date strings for comparison (assuming format like "20/01/2024 10:30 AM")
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'user':
          aValue = a.user.toLowerCase();
          bValue = b.user.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'source':
          aValue = (a.source || '').toLowerCase();
          bValue = (b.source || '').toLowerCase();
          break;
        case 'destination':
          aValue = (a.destination || '').toLowerCase();
          bValue = (b.destination || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchTerm, selectedType, selectedStatus, sortOption, sortOrder]);

  /**
   * Calculate summary metrics from all transactions
   * Computes total transactions, total inflow, total outflow, and total expenses
   */
  const summaryMetrics = useMemo(() => {
    const totalTransactions = mockExtendedTransactions.length;
    const totalInflow = mockExtendedTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalOutflow = Math.abs(
      mockExtendedTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    );
    const totalExpenses = Math.abs(
      mockExtendedTransactions
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    );

    return {
      totalTransactions,
      totalInflow,
      totalOutflow,
      totalExpenses,
    };
  }, []);

  /**
   * Get badge component for transaction type
   * Returns appropriate badge with icon and color based on transaction type
   *
   * @param type - Transaction type
   * @returns Badge component with appropriate styling
   */
  const getTransactionTypeBadge = (type: VaultTransactionType) => {
    if (type === 'Treasury Deposit' || type === 'Machine Drop' || type === 'Drop') {
      return (
        <Badge className="bg-button text-white hover:bg-button/90">
          <ArrowUp className="mr-1 h-3 w-3" />
          Inflow
        </Badge>
      );
    }
    if (type === 'Bank Transfer' || type === 'Float Increase' || type === 'Float Decrease') {
      return (
        <Badge className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90">
          <ArrowDown className="mr-1 h-3 w-3" />
          Outflow
        </Badge>
      );
    }
    if (type === 'Expense') {
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-600/90">
          <Receipt className="mr-1 h-3 w-3" />
          Expense
        </Badge>
      );
    }
    return <Badge>{type}</Badge>;
  };

  /**
   * Handle table column sort
   * Toggles sort order if clicking the same column, otherwise sets new sort column
   *
   * @param column - Column to sort by
   */
  const handleSort = (column: TransactionSortOption) => {
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
        <h1 className="text-2xl font-semibold text-gray-900">Transaction History</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor all vault transaction history
        </p>
      </div>

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
            <SelectItem value="Treasury Deposit">Treasury Deposit</SelectItem>
            <SelectItem value="Machine Drop">Machine Drop</SelectItem>
            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            <SelectItem value="Expense">Expense</SelectItem>
            <SelectItem value="Float Increase">Float Increase</SelectItem>
            <SelectItem value="Float Decrease">Float Decrease</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                  {summaryMetrics.totalTransactions}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inflow</p>
                <p className="break-words text-xl font-bold text-button sm:text-2xl">
                  {formatAmount(summaryMetrics.totalInflow)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-button/10">
                <ArrowUp className="h-5 w-5 text-button" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Outflow</p>
                <p className="break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                  {formatAmount(summaryMetrics.totalOutflow)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orangeHighlight/10">
                <ArrowDown className="h-5 w-5 text-orangeHighlight" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="break-words text-xl font-bold text-red-600 sm:text-2xl">
                  {formatAmount(summaryMetrics.totalExpenses)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Receipt className="h-5 w-5 text-red-600" />
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
          <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
        </div>

        {/* Desktop Table View - lg and above */}
        <VaultTransactionsTable
          transactions={filteredAndSortedTransactions}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={handleSort}
          getTransactionTypeBadge={getTransactionTypeBadge}
        />

        {/* Mobile/Tablet Card View - below lg */}
        <VaultTransactionsMobileCards
          transactions={filteredAndSortedTransactions}
          getTransactionTypeBadge={getTransactionTypeBadge}
        />
      </div>
      </div>
    </PageLayout>
  );
}
