/**
 * Vault Overview Page Content Component
 *
 * Main dashboard content for the Vault Management application.
 * Orchestrates all dashboard sections and components.
 *
 * Features:
 * - Vault balance card
 * - Metric cards (Machine Cash, Desk Float, Total On Premises)
 * - Cash desk status cards
 * - Quick actions section
 * - Recent activity table
 * - Modal management
 *
 * @module components/VAULT/VaultOverviewPageContent
 */
'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import VaultBalanceCard from './cards/VaultBalanceCard';
import VaultMetricCard from './cards/VaultMetricCard';
import VaultCashDeskCard from './cards/VaultCashDeskCard';
import VaultQuickActionsSection from './sections/VaultQuickActionsSection';
import VaultRecentActivitySection from './sections/VaultRecentActivitySection';
import VaultAddCashModal from './modals/VaultAddCashModal';
import VaultRemoveCashModal from './modals/VaultRemoveCashModal';
import VaultRecordExpenseModal from './modals/VaultRecordExpenseModal';
import VaultReconcileModal from './modals/VaultReconcileModal';
import ShiftReviewPanel from './ShiftReviewPanel';
import NotificationBell from '@/components/shared/ui/NotificationBell';
import VaultOverviewSkeleton from '@/components/ui/skeletons/VaultOverviewSkeleton';
import { DEFAULT_VAULT_BALANCE, DEFAULT_VAULT_METRICS } from './data/defaults';
import { CreditCard, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';
import {
  fetchVaultOverviewData,
  fetchVaultBalance,
  handleAddCash,
  handleRemoveCash,
  handleRecordExpense,
  handleReconcile,
  handleShiftResolve,
  handleNotificationClick,
} from '@/lib/helpers/vaultHelpers';
import type {
  VaultBalance,
  VaultTransaction,
  UnbalancedShiftInfo,
  VaultMetrics,
  CashDesk,
  Denomination,
} from '@/shared/types/vault';
import type { NotificationItem } from '@/components/shared/ui/NotificationBell';

export default function VaultOverviewPageContent() {
  const router = useRouter();
  const { user } = useUserStore();

  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [vaultBalance, setVaultBalance] = useState<VaultBalance>(
    DEFAULT_VAULT_BALANCE
  );
  const [metrics, setMetrics] = useState<VaultMetrics>(DEFAULT_VAULT_METRICS);
  const [cashDesks, setCashDesks] = useState<CashDesk[]>([]);
  const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
  const [pendingShifts, setPendingShifts] = useState<UnbalancedShiftInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [addCashOpen, setAddCashOpen] = useState(false);
  const [removeCashOpen, setRemoveCashOpen] = useState(false);
  const [recordExpenseOpen, setRecordExpenseOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [shiftReviewLoading, setShiftReviewLoading] = useState(false);

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      const locationId = user?.assignedLocations?.[0];
      if (!locationId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchVaultOverviewData(locationId, user?.username);
        setVaultBalance(data.vaultBalance);
        setMetrics(data.metrics);
        setTransactions(data.transactions);
        setPendingShifts(data.pendingShifts);
        setCashDesks(data.cashDesks);
        setNotifications(data.notifications);
      } catch (error) {
        console.error('Failed to fetch vault data', error);
        toast.error('Failed to load vault data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.assignedLocations, user?.username]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleManageCashiers = () => {
    router.push('/vault/management/cashiers');
  };

  const handleMachineCollection = () => {
    router.push('/vault/management/collections');
  };

  const handleSoftCount = () => {
    router.push('/vault/management/soft-counts');
  };

  /**
   * Handle add cash confirmation from modal
   */
  const handleAddCashConfirm = async (data: {
    source: string;
    breakdown: {
      hundred: number;
      fifty: number;
      twenty: number;
      ten: number;
      five: number;
      one: number;
    };
    totalAmount: number;
    notes?: string;
  }) => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      toast.error('No location assigned');
      return;
    }

    const result = await handleAddCash(data, locationId);
    if (result.success) {
      toast.success(`Added ${data.totalAmount.toLocaleString()} to vault`);
      setAddCashOpen(false);
      // Refresh balance
      const balanceData = await fetchVaultBalance(locationId);
      if (balanceData) {
        setVaultBalance(prev => ({ ...prev, ...balanceData }));
      }
    } else {
      toast.error(result.error || 'Failed to add cash');
    }
  };

  /**
   * Handle remove cash confirmation from modal
   */
  const handleRemoveCashConfirm = async (data: {
    destination: string;
    breakdown: {
      hundred: number;
      fifty: number;
      twenty: number;
      ten: number;
      five: number;
      one: number;
    };
    totalAmount: number;
    notes?: string;
  }) => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      toast.error('No location assigned');
      return;
    }

    const result = await handleRemoveCash(data, locationId);
    if (result.success) {
      toast.success(`Removed ${data.totalAmount.toLocaleString()} from vault`);
      setRemoveCashOpen(false);
      // Refresh balance
      const balanceData = await fetchVaultBalance(locationId);
      if (balanceData) {
        setVaultBalance(prev => ({ ...prev, ...balanceData }));
      }
    } else {
      toast.error(result.error || 'Failed to remove cash');
    }
  };

  /**
   * Handle record expense confirmation from modal
   */
  const handleRecordExpenseConfirm = async (data: {
    category: string;
    amount: number;
    description: string;
    date: Date;
  }) => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      toast.error('No location assigned');
      return;
    }

    const result = await handleRecordExpense(data, locationId);
    if (result.success) {
      toast.success(`Recorded expense: ${data.amount.toLocaleString()}`);
      setRecordExpenseOpen(false);
      // Refresh balance
      const balanceData = await fetchVaultBalance(locationId);
      if (balanceData) {
        setVaultBalance(prev => ({ ...prev, ...balanceData }));
      }
    } else {
      toast.error(result.error || 'Failed to record expense');
    }
  };

  /**
   * Handle reconcile confirmation
   */
  const handleReconcileConfirm = async (data: {
    newBalance: number;
    denominations: Denomination[];
    reason: string;
    comment: string;
  }) => {
    if (!vaultBalance.activeShiftId) {
      toast.error('No active vault shift found');
      return;
    }

    const result = await handleReconcile(data, vaultBalance.activeShiftId);
    if (result.success) {
      toast.success('Vault reconciled successfully');
      setReconcileOpen(false);
      // Refresh balance
      const locationId = user?.assignedLocations?.[0];
      if (locationId) {
        const balanceData = await fetchVaultBalance(locationId);
        if (balanceData) {
          setVaultBalance(prev => ({ ...prev, ...balanceData }));
        }
      }
    } else {
      toast.error(result.error || 'Failed to reconcile');
    }
  };

  /**
   * Handle shift review resolution
   */
  const handleShiftResolveConfirm = async (
    shiftId: string,
    finalBalance: number,
    auditComment: string
  ) => {
    setShiftReviewLoading(true);
    const result = await handleShiftResolve(
      shiftId,
      finalBalance,
      auditComment
    );
    if (result.success) {
      toast.success(`Shift resolved with final balance: ${finalBalance}`);
      setPendingShifts(prev => prev.filter(s => s.shiftId !== shiftId));
    } else {
      toast.error(result.error || 'Failed to resolve shift');
    }
    setShiftReviewLoading(false);
  };

  const handleMarkNotificationAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications([]);
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <PageLayout showHeader={false}>
        <VaultOverviewSkeleton />
      </PageLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Vault Manager
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              onMarkAsRead={handleMarkNotificationAsRead}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onNotificationClick={handleNotificationClick}
            />
            <div className="text-right">
              <p className="text-sm text-gray-600">Manager On Shift</p>
              <p className="font-semibold text-gray-900">
                {vaultBalance.managerOnDuty}
              </p>
            </div>
          </div>
        </div>

        {/* Shift Review Panel - Show when there are pending reviews */}
        {pendingShifts.length > 0 && (
          <ShiftReviewPanel
            pendingShifts={pendingShifts}
            onResolve={handleShiftResolveConfirm}
            loading={shiftReviewLoading}
          />
        )}

        {/* Vault Balance Card */}
        <VaultBalanceCard
          balance={vaultBalance}
          onReconcile={() => setReconcileOpen(true)}
        />

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Cash Desks Status Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Cash Desks Status
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cashDesks.length > 0 ? (
              cashDesks.map(cashDesk => (
                <VaultCashDeskCard key={cashDesk._id} cashDesk={cashDesk} />
              ))
            ) : (
              <p className="text-sm text-gray-500">No active cash desks.</p>
            )}
          </div>
        </div>

        {/* Quick Actions Section */}
        <VaultQuickActionsSection
          onAddCash={() => setAddCashOpen(true)}
          onRemoveCash={() => setRemoveCashOpen(true)}
          onRecordExpense={() => setRecordExpenseOpen(true)}
          onManageCashiers={handleManageCashiers}
          onMachineCollection={handleMachineCollection}
          onSoftCount={handleSoftCount}
        />

        {/* Recent Activity Section */}
        <VaultRecentActivitySection transactions={transactions} />

        {/* Modals */}
        <VaultAddCashModal
          open={addCashOpen}
          onClose={() => setAddCashOpen(false)}
          onConfirm={handleAddCashConfirm}
        />
        <VaultRemoveCashModal
          open={removeCashOpen}
          onClose={() => setRemoveCashOpen(false)}
          onConfirm={handleRemoveCashConfirm}
        />
        <VaultRecordExpenseModal
          open={recordExpenseOpen}
          onClose={() => setRecordExpenseOpen(false)}
          onConfirm={handleRecordExpenseConfirm}
        />
        <VaultReconcileModal
          open={reconcileOpen}
          onClose={() => setReconcileOpen(false)}
          onConfirm={handleReconcileConfirm}
          currentBalance={vaultBalance.balance}
        />
      </div>
    </PageLayout>
  );
}
