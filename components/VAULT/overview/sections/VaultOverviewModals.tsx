/**
 * Vault Overview Modals Section Component
 *
 * Centralizes all modals used by the Vault Manager in the overview dashboard.
 * 
 * @module components/VAULT/overview/sections/VaultOverviewModals
 */
'use client';

import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';

// Modals
import VaultOverviewAddCashModal from '../modals/VaultOverviewAddCashModal';
import VaultOverviewInitializeModal from '../modals/VaultOverviewInitializeModal';
import VaultOverviewReconcileModal from '../modals/VaultOverviewReconcileModal';
import VaultOverviewRecordExpenseModal from '../modals/VaultOverviewRecordExpenseModal';
import VaultOverviewRemoveCashModal from '../modals/VaultOverviewRemoveCashModal';
import VaultOverviewSoftCountModal from '../modals/VaultOverviewSoftCountModal';
import VaultOverviewViewDenominationsModal from '../modals/VaultOverviewViewDenominationsModal';

type VaultOverviewModalsProps = {
  modals: {
    addCash: boolean;
    removeCash: boolean;
    recordExpense: boolean;
    reconcile: boolean;
    initialize: boolean;
    softCount: boolean;
    viewDenominations: boolean;
  };
  vaultBalance: number;
  onClose: (key: string) => void;
  onConfirm: (key: string, data?: Record<string, unknown>) => Promise<void>;
  machines?: GamingMachine[];
  viewDenomsData: { 
    title: string; 
    denominations: Denomination[]; 
    total: number;
  } | null;
  currentDenominations: Denomination[];
  isInitial: boolean;
  currentVaultShiftId?: string;
  currentLocationId?: string;
};

export default function VaultOverviewModals({
  modals,
  vaultBalance,
  onClose,
  onConfirm,
  machines = [],
  viewDenomsData,
  currentDenominations,
  isInitial = false,
  currentVaultShiftId,
  currentLocationId,
}: VaultOverviewModalsProps) {
  return (
    <>
      <VaultOverviewAddCashModal
        open={modals.addCash}
        onClose={() => onClose('addCash')}
        onConfirm={(data) => onConfirm('addCash', data)}
      />
      <VaultOverviewRemoveCashModal
        open={modals.removeCash}
        onClose={() => onClose('removeCash')}
        vaultDenominations={currentDenominations}
        onConfirm={(data) => onConfirm('removeCash', data)}
      />
      <VaultOverviewRecordExpenseModal
        open={modals.recordExpense}
        onClose={() => onClose('recordExpense')}
        vaultDenominations={currentDenominations}
        onConfirm={(data) => onConfirm('recordExpense', data)}
      />
      <VaultOverviewReconcileModal
        open={modals.reconcile}
        onClose={() => onClose('reconcile')}
        onConfirm={(data) => onConfirm('reconcile', data)}
        currentBalance={vaultBalance}
        systemDenominations={currentDenominations}
      />
      <VaultOverviewInitializeModal
        open={modals.initialize}
        onClose={() => onClose('initialize')}
        onConfirm={(data) => onConfirm('initialize', data)}
        expectedBalance={vaultBalance}
        expectedDenominations={currentDenominations}
        isInitial={isInitial}
      />
      <VaultOverviewSoftCountModal
        open={modals.softCount}
        onClose={() => onClose('softCount')}
        onConfirm={() => onConfirm('softCount')}
        machines={machines}
        currentVaultShiftId={currentVaultShiftId}
        currentLocationId={currentLocationId}
      />
      <VaultOverviewViewDenominationsModal
        open={modals.viewDenominations}
        onClose={() => onClose('viewDenominations')}
        title={viewDenomsData?.title || 'View Denominations'}
        denominations={viewDenomsData?.denominations || []}
        totalAmount={viewDenomsData?.total || 0}
      />
    </>
  );
}
