/**
 * Vault Expenses Page Content Component
 *
 * Displays expense history with filtering and summary cards.
 *
 * Features:
 * - Summary cards (Today, Week, Month totals)
 * - Expense history table with date/category filters
 * - Record Expense modal trigger
 * - Mobile-responsive card layout
 *
 * @module components/VAULT/expenses/VaultExpensesPageContent
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import type { DateRange } from '@/components/shared/ui/dateRangePicker';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shared/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import VaultOverviewRecordExpenseModal from '@/components/VAULT/overview/modals/VaultOverviewRecordExpenseModal';
import StaleShiftDetectedBlock from '@/components/VAULT/shared/StaleShiftDetectedBlock';
import VaultTransactionDetailsModal from '@/components/VAULT/transactions/modals/VaultTransactionDetailsModal';
import { useVaultShift } from '@/lib/hooks/vault/useVaultShift';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type { Denomination, ExpenseCategory, VaultTransaction } from '@/shared/types/vault';
import axios from 'axios';
import { format } from 'date-fns';
import { DollarSign, FileText, Paperclip, Plus, Receipt, RefreshCw } from 'lucide-react';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================
type ExpenseSummary = {
  today: number;
  thisWeek: number;
  thisMonth: number;
};

// ============================================================================
// Constants
// ============================================================================
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food/Drinks',
  'Repairs',
  'Bills',
  'Worker/Employee',
  'Bank Account',
  'Other',
];

// ============================================================================
// Component
// ============================================================================
export default function VaultExpensesPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user, hasActiveVaultShift, isVaultReconciled, isStaleShift } = useUserStore();
  const locationId = user?.assignedLocations?.[0] || '';
  const [expenses, setExpenses] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<VaultTransaction | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from, to };
  });
  const [category, setCategory] = useState<string>('all');


  // Summary
  const [summary, setSummary] = useState<ExpenseSummary>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (locationId) {
        params.append('locationId', locationId);
      }
      if (dateRange?.from) {
        const startDate = new Date(dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        params.append('startDate', startDate.toISOString());
      }
      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());
      }
      if (category && category !== 'all') {
        params.append('category', category);
      }

      const response = await axios.get(`/api/vault/expense?${params.toString()}`);
      if (response.data.success) {
        setExpenses(response.data.expenses);
        calculateSummary(response.data.expenses);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [locationId, dateRange, category]);

  /**
   * Calculate summary totals from expenses
   */
  const calculateSummary = (expenseList: VaultTransaction[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;

    expenseList.forEach(exp => {
      const expDate = new Date(exp.timestamp);
      if (expDate >= todayStart) {
        today += exp.amount;
      }
      if (expDate >= weekStart) {
        thisWeek += exp.amount;
      }
      if (expDate >= monthStart) {
        thisMonth += exp.amount;
      }
    });

    setSummary({ today, thisWeek, thisMonth });
  };

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleRecordExpense = async (data: {
    category: ExpenseCategory;
    amount: number;
    description: string;
    date: Date;
    denominations?: Denomination[]; 
    file?: File;
    bankDetails?: Record<string, string>;
    expenseDetails?: Record<string, unknown>;
  }) => {
    try {
      // Use FormData to support file upload
      const formData = new FormData();
      formData.append('category', data.category);
      formData.append('amount', data.amount.toString());
      formData.append('description', data.description);
      formData.append('date', data.date.toISOString());
      
      if (data.bankDetails) formData.append('bankDetails', JSON.stringify(data.bankDetails));
      if (data.expenseDetails) formData.append('expenseDetails', JSON.stringify(data.expenseDetails));

      if (data.denominations) {
        formData.append('denominations', JSON.stringify(data.denominations));
      }

      if (data.file) {
        formData.append('file', data.file);
      }

      // API now expects FormData (multipart/form-data)
      // Axios automatically sets the Content-Type header to multipart/form-data when passing FormData
      const response = await axios.post('/api/vault/expense', formData);

      if (response.data.success) {
        toast.success(`Expense recorded: $${data.amount.toFixed(2)}`);
        fetchExpenses();
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to record expense');
      }
      throw error;
    }
  };

  const handleClearFilters = () => {
    setDateRange(undefined);
    setCategory('all');
  };



  const { vaultBalance } = useVaultShift();

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout onRefresh={fetchExpenses} refreshing={loading}>
      <div className="flex flex-col gap-6">
        <StaleShiftDetectedBlock isStale={isStaleShift} openedAt={vaultBalance?.openedAt} type="vault">
          <div className="flex flex-col gap-6">
        <VaultManagerHeader title="Expenses" description="Manage vault expense records">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchExpenses();
                toast.success('Expenses refreshed');
              }}
              className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button 
              onClick={() => {
                if (!hasActiveVaultShift) {
                  toast.error('Operation Blocked', {
                    description: 'You must start a vault shift before recording expenses.'
                  });
                  return;
                }
                if (isStaleShift) {
                  toast.error('Stale Shift Detected', {
                    description: 'This shift is from a previous gaming day. You must close this shift first.'
                  });
                  return;
                }
                if (!isVaultReconciled) {
                  toast.error('Reconciliation Required', {
                    description: 'Please perform the mandatory opening reconciliation before recording expenses.'
                  });
                  return;
                }
                setShowModal(true);
              }} 
              className={cn(
                "gap-2",
                (!hasActiveVaultShift || !isVaultReconciled || isStaleShift) && "opacity-40 cursor-not-allowed"
              )}
            >
              <Plus className="h-4 w-4" />
              Record Expense
            </Button>
          </div>
        </VaultManagerHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.today.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.thisWeek.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.thisMonth.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Date Range</label>
              <ModernCalendar
                mode="range"
                date={dateRange}
                onSelect={(range) => {
                  if (range?.from) {
                    setDateRange({ from: range.from, to: range.to || range.from });
                  } else {
                    setDateRange(undefined);
                  }
                }}
                maxDate={new Date()}
                className="w-48 sm:w-64"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </div>
          </CardContent>
      </Card>

      {/* Expense Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No expenses found
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(expense => (
                      <TableRow key={expense._id}>
                        <TableCell>{expense.to?.id || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <span>
                              {expense.notes?.replace('Expense: ', '').split(' - ')[1] || '-'}
                            </span>
                            {expense.attachmentId && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          -${expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.timestamp), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-violet-600 font-bold px-3"
                            onClick={() => setSelectedExpense(expense)}
                          >
                            <FileText className="mr-1 h-3.5 w-3.5" /> Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {expenses.map(expense => (
                  <Card key={expense._id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{expense.to?.id || 'Expense'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(expense.timestamp), 'MMM d, yyyy')}
                        </p>
                        <p className="mt-1 text-sm">
                          {expense.notes?.replace('Expense: ', '').split(' - ')[1] || '-'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-red-600 text-lg">
                          -${expense.amount.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] text-violet-600 font-bold px-2 mt-auto"
                          onClick={() => setSelectedExpense(expense)}
                        >
                          <FileText className="mr-1 h-3 w-3" /> Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <VaultOverviewRecordExpenseModal
        open={showModal}
        onClose={() => setShowModal(false)}
        vaultDenominations={vaultBalance?.denominations || []}
        onConfirm={(data) => handleRecordExpense({
          ...data,
          description: data.description || '', // Ensure string
          denominations: data.denominations,
        })}
      />

      <VaultTransactionDetailsModal
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        transaction={selectedExpense}
      />
          </div>
        </StaleShiftDetectedBlock>
      </div>
    </PageLayout>
  );
}
