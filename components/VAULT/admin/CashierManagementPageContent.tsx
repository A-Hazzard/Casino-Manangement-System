'use client';

// ============================================================================
// External Dependencies
// ============================================================================
import { useRef, useState } from 'react';

// ============================================================================
// Internal Components & Hooks
// ============================================================================
import PageLayout from '@/components/shared/layout/PageLayout';
import CashierManagementSkeleton from '@/components/ui/skeletons/CashierManagementSkeleton';
import CashierManagementPanel from '@/components/VAULT/admin/CashierManagementPanel';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import StaleShiftDetectedBlock from '@/components/VAULT/shared/StaleShiftDetectedBlock';
import { useVaultShift } from '@/lib/hooks/vault/useVaultShift';

export default function CashierManagementPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const { vaultBalance, isStaleShift, loading: shiftLoading } = useVaultShift();

  // ============================================================================
  // Local State & Refs
  // ============================================================================
  const [panelLoading, setPanelLoading] = useState(true);
  const refreshFnRef = useRef<() => void>(() => {});

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleRefresh = () => {
    refreshFnRef.current();
  };

  // ============================================================================
  // Render
  // ============================================================================
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
    <PageLayout
      pageTitle="Cashier Management"
      onRefresh={handleRefresh}
      refreshing={panelLoading}
    >
      <div className="space-y-6">
        <VaultManagerHeader />

        <StaleShiftDetectedBlock
          isStale={isStaleShift}
          openedAt={vaultBalance?.openedAt}
          type="vault"
        >
          <CashierManagementPanel
            onLoadingChange={setPanelLoading}
            onRefresh={fn => {
              refreshFnRef.current = fn;
            }}
          />
        </StaleShiftDetectedBlock>
      </div>
    </PageLayout>
  );
}
