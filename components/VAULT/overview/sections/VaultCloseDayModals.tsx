'use client';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useState } from 'react';

import VaultCloseShiftModal from '@/components/VAULT/overview/modals/VaultCloseShiftModal';
import VaultCollectionWizardModal from '@/components/VAULT/overview/modals/VaultCollectionWizardModal';
import VaultForceEndShiftModal from '@/components/VAULT/overview/modals/VaultForceEndShiftModal';
import VaultShiftReviewModal from '@/components/VAULT/overview/modals/VaultShiftReviewModal';
import VaultSoftCountModal from '@/components/VAULT/overview/modals/VaultSoftCountModal';
import VaultActiveShiftsModal from '@/components/VAULT/overview/sections/VaultActiveShiftsModal';
import type { CloseDayStep } from '@/lib/hooks/vault/useVaultCloseDay';
import type { GamingMachine } from '@/shared/types/entities';
import type { CashDesk, UnbalancedShiftInfo, VaultBalance } from '@/shared/types/vault';

interface VaultCloseDayModalsProps {
  activeStep: CloseDayStep;
  vaultBalance: VaultBalance | null;
  machines: GamingMachine[];
  activeShifts: CashDesk[];
  pendingShifts: UnbalancedShiftInfo[];
  showBlockedShifts: boolean;
  setShowBlockedShifts: (show: boolean) => void;
  locationId?: string;
  onClose: () => void;
  onConfirm: (type: string, data?: any) => Promise<void>;
  onRefresh?: () => void;
}

export default function VaultCloseDayModals({
  activeStep,
  vaultBalance,
  machines,
  activeShifts,
  pendingShifts,
  showBlockedShifts,
  setShowBlockedShifts,
  locationId,
  onClose,
  onConfirm,
  onRefresh
}: VaultCloseDayModalsProps) {
  const { selectedLicencee } = useDashBoardStore();
  const [forceCloseCashier, setForceCloseCashier] = useState<any>(null);
  const [reviewShift, setReviewShift] = useState<UnbalancedShiftInfo | null>(null);

  return (
    <>
      <VaultCollectionWizardModal
        open={activeStep === 'collection'}
        onClose={onClose}
        onConfirm={() => onConfirm('collection')}
        machines={machines}
        currentVaultShiftId={vaultBalance?.activeShiftId || undefined}
        currentLocationId={locationId}
      />

      <VaultSoftCountModal
        open={activeStep === 'softCount'}
        onClose={onClose}
        onConfirm={() => onConfirm('softCount')}
        machines={machines}
        currentVaultShiftId={vaultBalance?.activeShiftId || undefined}
        currentLocationId={locationId}
      />

      <VaultCloseShiftModal
        open={activeStep === 'closeShift'}
        onClose={onClose}
        onConfirm={(balance, denominations) => onConfirm('closeShift', { closingBalance: balance, denominations })}
        currentBalance={vaultBalance?.balance || 0}
        canClose={vaultBalance?.canClose || false}
        blockReason={vaultBalance?.blockReason}
        locationId={locationId}
      />

      <VaultActiveShiftsModal
        open={showBlockedShifts}
        onClose={() => setShowBlockedShifts(false)}
        activeShifts={activeShifts}
        pendingShifts={pendingShifts}
        onReviewShift={(shiftId) => {
           // Find the shift info from the pending list
           const shiftObj = pendingShifts.find(s => s.shiftId === shiftId);
           if (shiftObj) {
              setReviewShift(shiftObj);
           }
        }}
        onForceCloseShift={(cashier) => {
           setForceCloseCashier(cashier);
        }}
      />

      <VaultShiftReviewModal
        open={!!reviewShift}
        onClose={() => setReviewShift(null)}
        shift={reviewShift}
        vaultInventory={vaultBalance?.denominations || []}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      <VaultForceEndShiftModal
        open={!!forceCloseCashier}
        onClose={() => setForceCloseCashier(null)}
        cashier={forceCloseCashier}
        licenseeId={selectedLicencee}
        locationId={locationId}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </>
  );
}
