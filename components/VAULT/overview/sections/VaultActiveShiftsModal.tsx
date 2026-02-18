'use client';

import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type { CashDesk, UnbalancedShiftInfo } from '@/shared/types/vault';
import { AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface VaultActiveShiftsModalProps {
  open: boolean;
  onClose: () => void;
  activeShifts: CashDesk[];
  pendingShifts: UnbalancedShiftInfo[];
  onReviewShift: (shiftId: string) => void;
  onForceCloseShift: (cashier: any) => void;
}

export default function VaultActiveShiftsModal({
  open,
  onClose,
  activeShifts,
  pendingShifts,
  onReviewShift,
  onForceCloseShift,
}: VaultActiveShiftsModalProps) {
  const { formatAmount } = useCurrencyFormat();

  const totalBlocked = activeShifts.length + pendingShifts.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Cannot Close Daily Operations
          </DialogTitle>
          <DialogDescription>
            There are still <strong>{totalBlocked}</strong> cashier shift(s) that must be resolved before the vault can be closed for the day.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Active Shifts */}
          {activeShifts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">Active Shifts (On-Duty)</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Cashier</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Current Float</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeShifts.map((shift) => (
                      <TableRow key={shift._id}>
                        <TableCell className="font-medium">{shift.cashierName}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {safeFormatDate(shift.lastAudit, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{formatAmount(shift.balance)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onForceCloseShift(shift)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            End Shift
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Pending Review Shifts */}
          {pendingShifts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-700 border-b border-amber-100 pb-1">Shifts Pending Review</h3>
              <div className="rounded-md border border-amber-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-amber-50">
                      <TableHead>Cashier</TableHead>
                      <TableHead>Closed At</TableHead>
                      <TableHead>Discrepancy</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingShifts.map((shift) => (
                      <TableRow key={shift.shiftId}>
                        <TableCell className="font-medium">{shift.cashierName}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                           {safeFormatDate(shift.closedAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </TableCell>
                        <TableCell className={cn(
                          "font-mono text-sm font-bold",
                          shift.discrepancy !== 0 ? "text-red-600" : "text-green-600"
                        )}>
                          {formatAmount(shift.discrepancy)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onReviewShift(shift.shiftId)}
                            className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 h-8"
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close Window</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
