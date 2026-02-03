/**
 * Vault Collection Modal Component
 *
 * Modal wrapper for MachineCollectionForm.
 *
 * @module components/VAULT/overview/modals/VaultCollectionModal
 */
'use client';

import MachineCollectionForm from '@/components/VAULT/machine/MachineCollectionForm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import { useState } from 'react';

type VaultCollectionModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (machineId: string, amount: number, denominations: Denomination[]) => Promise<void>;
  machines?: GamingMachine[];
};

export default function VaultCollectionModal({
  open,
  onClose,
  onConfirm,
  machines = [],
}: VaultCollectionModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    machineId: string,
    amount: number,
    denominations: Denomination[]
  ) => {
    setLoading(true);
    try {
      await onConfirm(machineId, amount, denominations);
      onClose();
    } catch (error) {
      console.error('Error recording collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Machine Collection</DialogTitle>
          <DialogDescription>
            Record cash collected from a gaming machine.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
            <MachineCollectionForm onSubmit={handleSubmit} loading={loading} machines={machines} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
