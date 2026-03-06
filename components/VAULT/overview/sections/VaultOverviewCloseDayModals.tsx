/**
 * Vault Overview Close Day Modals Component
 *
 * Orchestrates all modals related to the daily vault closure process.
 * 
 * @module components/VAULT/overview/sections/VaultOverviewCloseDayModals
 */
'use client';

import { useVaultLicensee } from '@/lib/hooks/vault/useVaultLicensee';
import { useState } from 'react';

import VaultOverviewForceEndShiftModal from '@/components/VAULT/overview/modals/VaultOverviewForceEndShiftModal';
import VaultOverviewShiftReviewModal from '@/components/VAULT/overview/modals/VaultOverviewShiftReviewModal';
import VaultOverviewSoftCountModal from '@/components/VAULT/overview/modals/VaultOverviewSoftCountModal';
import VaultOverviewActiveShiftsModal from '@/components/VAULT/overview/sections/VaultOverviewActiveShiftsModal';
import type { CloseDayStep } from '@/lib/hooks/vault/useVaultCloseDay';
import type { GamingMachine } from '@/shared/types/entities';
import type { CashDesk, UnbalancedShiftInfo, VaultBalance } from '@/shared/types/vault';

// Type that matches what VaultOverviewForceEndShiftModal expects
type ForceEndShiftCashier = {
  _id: string;
  cashierId?: string;
  username: string;
  cashierName?: string;
};

interface VaultOverviewCloseDayModalsProps {
  activeStep: CloseDayStep;
  vaultBalance: VaultBalance | null;
  machines: GamingMachine[];
  activeShifts: CashDesk[];
  pendingShifts: UnbalancedShiftInfo[];
  showBlockedShifts: boolean;
  setShowBlockedShifts: (show: boolean) => void;
  locationId?: string;
  onClose: () => void;
  onConfirm: (type: string, data?: Record<string, unknown>) => Promise<void>;
  onRefresh?: () => void;
}

export default function VaultOverviewCloseDayModals({
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
}: VaultOverviewCloseDayModalsProps) {
  const { licenseeId: selectedLicensee } = useVaultLicensee();
  const [forceCloseCashier, setForceCloseCashier] = useState<ForceEndShiftCashier | null>(null);
  const [reviewShift, setReviewShift] = useState<UnbalancedShiftInfo | null>(null);

  return (
    <>
      <VaultOverviewSoftCountModal
        open={activeStep === 'softCount'}
        onClose={onClose}
        onConfirm={() => onConfirm('softCount')}
        machines={machines}
        currentVaultShiftId={vaultBalance?.activeShiftId || undefined}
        currentLocationId={locationId}
        isEndOfDay={true}
      />

      <VaultOverviewActiveShiftsModal
        open={showBlockedShifts}
        onClose={() => setShowBlockedShifts(false)}
        activeShifts={activeShifts}
        pendingShifts={pendingShifts}
        isBlurred={!!forceCloseCashier || !!reviewShift}
        onReviewShift={(shiftId) => {
           // Find the shift info from the pending list
           const shiftObj = pendingShifts.find(s => s.shiftId === shiftId);
           if (shiftObj) {
              setReviewShift(shiftObj);
           }
        }}
        onForceCloseShift={(cashier) => {
           setForceCloseCashier({
             _id: cashier._id,
             cashierId: cashier.cashierId,
             username: cashier.name || cashier.cashierName || cashier._id,
             cashierName: cashier.cashierName,
           });
        }}
      />

      <VaultOverviewShiftReviewModal
        open={!!reviewShift}
        onClose={() => setReviewShift(null)}
        shift={reviewShift}
        vaultInventory={vaultBalance?.denominations || []}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      <VaultOverviewForceEndShiftModal
        open={!!forceCloseCashier}
        onClose={() => setForceCloseCashier(null)}
        cashier={forceCloseCashier}
        licenseeId={selectedLicensee}
        locationId={locationId}
        onSuccess={() => {
          setForceCloseCashier(null);
          setShowBlockedShifts(false);
          onRefresh?.();
        }}
      />
    </>
  );
}
