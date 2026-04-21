/**
 * Cashier Management Page
 *
 * Page for Vault Managers to manage cashier accounts.
 * Provides interface for creating, viewing, and resetting cashier passwords.
 *
 * @module app/vault/management/cashiers/page
 */

'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import CashierManagementSkeleton from '@/components/ui/skeletons/CashierManagementSkeleton';
import CashierManagementPanel from '@/components/VAULT/admin/CashierManagementPanel';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import StaleShiftDetectedBlock from '@/components/VAULT/shared/StaleShiftDetectedBlock';
import { useVaultShift } from '@/lib/hooks/vault/useVaultShift';
import { useCallback, useRef, useState } from 'react';

export default function CashierManagementPage() {
  const { vaultBalance, isStaleShift, loading: shiftLoading } = useVaultShift();
  const [panelLoading, setPanelLoading] = useState(true);
  const refreshFnRef = useRef<() => void>(() => {});

  const handleRefresh = useCallback(() => {
    refreshFnRef.current();
  }, []);

  if (shiftLoading && !vaultBalance) {
    return (
      <PageLayout pageTitle="Cashier Management">
        <div className="space-y-6">
          <VaultManagerHeader />
          <CashierManagementSkeleton />
        </div>
      </PageLayout>
    );
  }

  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <PageLayout
          pageTitle="Cashier Management"
          onRefresh={handleRefresh}
          refreshing={panelLoading}
        >
          <div className="space-y-6">
            <VaultManagerHeader />

            <StaleShiftDetectedBlock isStale={isStaleShift} openedAt={vaultBalance?.openedAt} type="vault">
              <CashierManagementPanel
                onLoadingChange={setPanelLoading}
                onRefresh={(fn) => { refreshFnRef.current = fn; }}
              />
            </StaleShiftDetectedBlock>
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
