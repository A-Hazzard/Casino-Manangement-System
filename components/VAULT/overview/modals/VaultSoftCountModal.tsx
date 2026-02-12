/**
 * Vault Soft Count Modal Component
 *
 * Modal wrapper for SoftCountForm.
 *
 * @module components/VAULT/overview/modals/VaultSoftCountModal
 */
'use client';

import SoftCountForm from '@/components/VAULT/machine/SoftCountForm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

type VaultSoftCountModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (machineId: string, amount: number, denominations: Denomination[], notes?: string) => Promise<void>;
  machines?: GamingMachine[];
};

export default function VaultSoftCountModal({
  open,
  onClose,
  onConfirm,
  machines = [],
}: VaultSoftCountModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    machineId: string,
    amount: number,
    denominations: Denomination[],
    notes?: string
  ) => {
    setLoading(true);
    try {
      await onConfirm(machineId, amount, denominations, notes);
      onClose();
    } catch (error) {
      console.error('Error recording soft count:', error);
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
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <RefreshCw className="h-5 w-5 text-violet-600" />
            Soft Count
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Record mid-day cash removal from a machine.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[75vh] overflow-y-auto p-6 custom-scrollbar">
            <SoftCountForm onSubmit={handleSubmit} loading={loading} machines={machines} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
