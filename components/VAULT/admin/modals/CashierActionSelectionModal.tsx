/**
 * Cashier Action Selection Modal
 *
 * Modal for selecting between viewing activity log or shift history for a cashier.
 *
 * @module components/VAULT/admin/modals/CashierActionSelectionModal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { BarChart3, History, User } from 'lucide-react';

type Cashier = {
  _id: string;
  username: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
};

type CashierActionSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cashier: Cashier | null;
  onSelectActivityLog: () => void;
  onSelectShiftHistory: () => void;
};

export default function CashierActionSelectionModal({
  isOpen,
  onClose,
  cashier,
  onSelectActivityLog,
  onSelectShiftHistory,
}: CashierActionSelectionModalProps) {
  if (!cashier) return null;

  const cashierName = cashier.profile
    ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
    : cashier.username;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {cashierName}
          </DialogTitle>
          <DialogDescription>
            Select what you'd like to view for this cashier
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button
            onClick={onSelectActivityLog}
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <History className="h-6 w-6" />
            <div className="flex flex-col">
              <span className="font-semibold">View Activity Log</span>
              <span className="text-xs text-muted-foreground">
                All transactions and operations
              </span>
            </div>
          </Button>

          <Button
            onClick={onSelectShiftHistory}
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <BarChart3 className="h-6 w-6" />
            <div className="flex flex-col">
              <span className="font-semibold">View Shift History</span>
              <span className="text-xs text-muted-foreground">
                All shift records and summaries
              </span>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
