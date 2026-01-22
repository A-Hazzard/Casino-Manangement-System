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

import { useState } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import VaultBalanceCard from './cards/VaultBalanceCard';
import VaultMetricCard from './cards/VaultMetricCard';
import VaultCashDeskCard from './cards/VaultCashDeskCard';
import VaultQuickActionsSection from './sections/VaultQuickActionsSection';
import VaultRecentActivitySection from './sections/VaultRecentActivitySection';
import VaultAddCashModal from './modals/VaultAddCashModal';
import VaultRemoveCashModal from './modals/VaultRemoveCashModal';
import VaultRecordExpenseModal from './modals/VaultRecordExpenseModal';
import {
  mockVaultBalance,
  mockVaultMetrics,
  mockCashDesks,
  mockTransactions,
} from './data/mockData';
import { CreditCard, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function VaultOverviewPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const [addCashOpen, setAddCashOpen] = useState(false);
  const [removeCashOpen, setRemoveCashOpen] = useState(false);
  const [recordExpenseOpen, setRecordExpenseOpen] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle add cash confirmation from modal
   * Placeholder for future API integration
   *
   * @param data - Cash addition data with source, breakdown, total amount, and notes
   */
  const handleAddCash = async (data: {
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
    // Mock API call - will be replaced with actual API
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(`Added ${data.totalAmount.toLocaleString()} to vault`);
    console.log('Add Cash:', data);
  };

  /**
   * Handle remove cash confirmation from modal
   * Placeholder for future API integration
   *
   * @param data - Cash removal data with destination, breakdown, total amount, and notes
   */
  const handleRemoveCash = async (data: {
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
    // Mock API call - will be replaced with actual API
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(`Removed ${data.totalAmount.toLocaleString()} from vault`);
    console.log('Remove Cash:', data);
  };

  /**
   * Handle record expense confirmation from modal
   * Placeholder for future API integration
   *
   * @param data - Expense data with category, amount, description, and date
   */
  const handleRecordExpense = async (data: {
    category: string;
    amount: number;
    description: string;
    date: Date;
  }) => {
    // Mock API call - will be replaced with actual API
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(`Recorded expense: ${data.amount.toLocaleString()}`);
    console.log('Record Expense:', data);
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vault Manager</h1>
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
          <div className="text-right">
            <p className="text-sm text-gray-600">Manager On Shift</p>
            <p className="font-semibold text-gray-900">
              {mockVaultBalance.managerOnDuty}
            </p>
          </div>
        </div>
      </div>

      {/* Vault Balance Card */}
      <VaultBalanceCard balance={mockVaultBalance} />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VaultMetricCard
          title="Vault Balance"
          value={mockVaultMetrics.vaultBalance}
          icon={Wallet}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <VaultMetricCard
          title="Machine Cash"
          value={mockVaultMetrics.machineCash}
          icon={CreditCard}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <VaultMetricCard
          title="Desk Float"
          value={mockVaultMetrics.deskFloat}
          icon={DollarSign}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
        <VaultMetricCard
          title="Total On Premises"
          value={mockVaultMetrics.totalOnPremises}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
      </div>

      {/* Cash Desks Status Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Cash Desks Status</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mockCashDesks.map(cashDesk => (
            <VaultCashDeskCard key={cashDesk.id} cashDesk={cashDesk} />
          ))}
        </div>
      </div>

      {/* Quick Actions Section */}
      <VaultQuickActionsSection
        onAddCash={() => setAddCashOpen(true)}
        onRemoveCash={() => setRemoveCashOpen(true)}
        onRecordExpense={() => setRecordExpenseOpen(true)}
      />

      {/* Recent Activity Section */}
      <VaultRecentActivitySection transactions={mockTransactions} />

      {/* Modals */}
      <VaultAddCashModal
        open={addCashOpen}
        onClose={() => setAddCashOpen(false)}
        onConfirm={handleAddCash}
      />
      <VaultRemoveCashModal
        open={removeCashOpen}
        onClose={() => setRemoveCashOpen(false)}
        onConfirm={handleRemoveCash}
      />
      <VaultRecordExpenseModal
        open={recordExpenseOpen}
        onClose={() => setRecordExpenseOpen(false)}
        onConfirm={handleRecordExpense}
      />
      </div>
    </PageLayout>
  );
}
