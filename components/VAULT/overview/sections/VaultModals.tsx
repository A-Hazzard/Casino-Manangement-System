/**
 * Vault Manager Modals Section
 *
 * Centralizes all modals used by the Vault Manager.
 *
 * @module components/VAULT/overview/sections/VaultModals
 */
'use client';

import VaultAddCashModal from '@/components/VAULT/overview/modals/VaultAddCashModal';
import VaultCloseShiftModal from '@/components/VAULT/overview/modals/VaultCloseShiftModal';
import VaultCollectionWizardModal from '@/components/VAULT/overview/modals/VaultCollectionWizardModal';
import VaultInitializeModal from '@/components/VAULT/overview/modals/VaultInitializeModal';
import VaultReconcileModal from '@/components/VAULT/overview/modals/VaultReconcileModal';
import VaultRecordExpenseModal from '@/components/VAULT/overview/modals/VaultRecordExpenseModal';
import VaultRemoveCashModal from '@/components/VAULT/overview/modals/VaultRemoveCashModal';
import VaultSoftCountModal from '@/components/VAULT/overview/modals/VaultSoftCountModal';
import ViewDenominationsModal from '@/components/VAULT/overview/modals/ViewDenominationsModal';
import type { Denomination } from '@/shared/types/vault';

import type { GamingMachine } from '@/shared/types/entities';

type VaultModalsProps = {
  modals: {
    addCash: boolean;
    removeCash: boolean;
    recordExpense: boolean;
    reconcile: boolean;
    initialize: boolean;
    collection: boolean;
    softCount: boolean;
    viewDenominations: boolean;
    closeShift: boolean;
  };
  vaultBalance: number;
  onClose: (key: string) => void;
  onConfirm: (key: string, data?: any) => Promise<void>;
  machines?: GamingMachine[];
  viewDenomsData: { 
    title: string; 
    denominations: Denomination[]; 
    total: number;
  } | null;
  currentDenominations: Denomination[];
  isInitial: boolean;
  canCloseVault: boolean;
  closeVaultBlockReason?: string;
  currentVaultShiftId?: string;
  currentLocationId?: string;
};

export default function VaultModals({
  modals,
  vaultBalance,
  onClose,
  onConfirm,
  machines = [],
  viewDenomsData,
  currentDenominations,
  isInitial = false,
  canCloseVault,
  closeVaultBlockReason,
  currentVaultShiftId,
  currentLocationId,
}: VaultModalsProps) {
  return (
    <>
      <VaultAddCashModal
        open={modals.addCash}
        onClose={() => onClose('addCash')}
        onConfirm={(data) => onConfirm('addCash', data)}
      />
      <VaultRemoveCashModal
        open={modals.removeCash}
        onClose={() => onClose('removeCash')}
        vaultDenominations={currentDenominations}
        onConfirm={(data) => onConfirm('removeCash', data)}
      />
      <VaultRecordExpenseModal
        open={modals.recordExpense}
        onClose={() => onClose('recordExpense')}
        vaultDenominations={currentDenominations}
        onConfirm={(data) => onConfirm('recordExpense', data)}
      />
      <VaultReconcileModal
        open={modals.reconcile}
        onClose={() => onClose('reconcile')}
        onConfirm={(data) => onConfirm('reconcile', data)}
        currentBalance={vaultBalance}
        systemDenominations={currentDenominations}
      />
      <VaultInitializeModal
        open={modals.initialize}
        onClose={() => onClose('initialize')}
        onConfirm={(data) => onConfirm('initialize', data)}
        expectedBalance={vaultBalance}
        expectedDenominations={currentDenominations}
        isInitial={isInitial}
      />
      <VaultCollectionWizardModal
        open={modals.collection}
        onClose={() => onClose('collection')}
        onConfirm={() => onConfirm('collection', { success: true })}
        machines={machines}
        currentVaultShiftId={currentVaultShiftId}
        currentLocationId={currentLocationId}
      />
      <VaultSoftCountModal
        open={modals.softCount}
        onClose={() => onClose('softCount')}
        onConfirm={(machineId, amount, denominations, notes) => onConfirm('softCount', { machineId, amount, denominations, notes })}
        machines={machines}
      />
      
      <ViewDenominationsModal
        open={modals.viewDenominations}
        onClose={() => onClose('viewDenominations')}
        title={viewDenomsData?.title || 'View Denominations'}
        denominations={viewDenomsData?.denominations || []}
        totalAmount={viewDenomsData?.total || 0}
      />
      
      <VaultCloseShiftModal
        open={modals.closeShift}
        onClose={() => onClose('closeShift')}
        onConfirm={(balance, denominations) => onConfirm('closeShift', { closingBalance: balance, denominations })}
        currentBalance={vaultBalance}
        canClose={canCloseVault}
        blockReason={closeVaultBlockReason}
      />
    </>
  );
}
